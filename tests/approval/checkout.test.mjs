import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
process.on('uncaughtException', e => { console.error(e.message, e.where || '', e.query || ''); process.exit(1) })
const db = new PGlite()
const root = new URL('../../', import.meta.url)
await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;`)
let schema=readFileSync(new URL('supabase/migrations/001_initial_schema.sql',root),'utf8')
schema=schema.replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', '').replaceAll('uuid_generate_v4()', 'gen_random_uuid()')
await db.exec(schema)
for (const file of ['002_tracking_and_newsletter.sql','003_coupons.sql','004_vendor_location.sql','005_shipping_returns.sql','006_flash_deals.sql']) {
  await db.exec(readFileSync(new URL(`supabase/migrations/${file}`,root),'utf8').replaceAll('uuid_generate_v4()', 'gen_random_uuid()'))
}
await db.exec(`CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1,'/') $$;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;`)
await db.exec(readFileSync(new URL('supabase/migrations/007_approval_workflows.sql',root),'utf8'))
await db.exec(readFileSync(new URL('supabase/migrations/008_catalog_launch.sql',root),'utf8'))
await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;`)
await db.exec(readFileSync(new URL('supabase/migrations/009_payment_events.sql',root),'utf8'))
await db.exec(readFileSync(new URL('supabase/migrations/010_product_workflow.sql',root),'utf8'))
await db.exec('GRANT USAGE ON SCHEMA public,auth TO service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;')


for (const file of ['011_private_data_and_fulfillment.sql','012_reserved_checkout.sql','013_atomic_returns.sql','014_notification_delivery.sql','015_financial_operations.sql','016_launch_configuration.sql','017_scheduled_deals.sql','018_checkout_recovery.sql','019_contact_and_leads.sql','020_verified_reviews.sql','021_order_policy_snapshots.sql','022_background_recovery.sql','023_profile_visibility_and_commission.sql','024_financial_notifications.sql']) await db.exec(readFileSync(new URL(`supabase/migrations/${file}`,root),'utf8'));

const buyer='00000000-0000-0000-0000-000000000001'
const seller='00000000-0000-0000-0000-000000000002'
await db.query(`INSERT INTO auth.users VALUES ($1,'buyer@example.invalid','{}'),($2,'seller@example.invalid','{}')`,[buyer,seller])
const vendor=(await db.query(`INSERT INTO vendors(user_id,business_name,slug,status,stripe_onboarding_complete,stripe_account_id) VALUES ($1,'Brand','brand','approved',true,'acct_test') RETURNING id`,[seller])).rows[0].id
const product=(await db.query(`INSERT INTO products(category_id,vendor_id,title,slug,price,status,inventory_count) VALUES ((SELECT id FROM categories LIMIT 1),$1,'Item','item',10,'approved',10) RETURNING id`,[vendor])).rows[0].id
const cart=[{product_id:product,variant_id:null,quantity:2}]
const key='00000000-0000-0000-0000-000000000003'
let checks=0
async function equal(sql,value,params=[]) {assert.equal(Object.values((await db.query(sql,params)).rows[0])[0],value);checks++}
async function denied(fn) {await assert.rejects(fn);checks++}
async function reserve(k=key,c=cart,live=false) {return (await db.query('SELECT reserve_checkout($1,$2,$3,$4,$5) result',[buyer,k,JSON.stringify(c),'buyer@example.invalid',live])).rows[0].result}
await db.exec('SET ROLE service_role')
await denied(()=>reserve())
await db.exec(`RESET ROLE; UPDATE site_settings SET value=jsonb_set(value,'{checkout_mode}','"test"') WHERE key='launch_config'; SET ROLE service_role`)
await denied(()=>reserve(key,cart,true))
const first=await reserve()
assert.equal((await reserve()).order.id,first.order.id);checks++
await equal('SELECT inventory_count FROM products WHERE id=$1',8,[product])
await denied(()=>reserve(key,[{...cart[0],quantity:3}]))
await denied(()=>reserve('00000000-0000-0000-0000-000000000004',[{...cart[0],quantity:9}]))
await equal('SELECT inventory_count FROM products WHERE id=$1',8,[product])
await db.query(`UPDATE orders SET checkout_session_id='cs_one' WHERE id=$1`,[first.order.id])
await denied(()=>db.query(`SELECT release_checkout($1,'cs_wrong')`,[first.order.id]))
await db.exec(`RESET ROLE; UPDATE vendors SET status='rejected' WHERE id='${vendor}'; SET ROLE service_role`)
await db.query(`SELECT release_checkout($1,'cs_one')`,[first.order.id])
await db.query(`SELECT release_checkout($1,'cs_one')`,[first.order.id])
await equal('SELECT inventory_count FROM products WHERE id=$1',10,[product])
await db.exec(`RESET ROLE; UPDATE vendors SET status='approved' WHERE id='${vendor}'; SET ROLE service_role`)
const second=await reserve('00000000-0000-0000-0000-000000000005')
await db.query(`UPDATE orders SET checkout_session_id='cs_two' WHERE id=$1`,[second.order.id])
const address=JSON.stringify({name:'Test',line1:'123 Test',city:'Denver',state:'CO',postal_code:'80202',country:'US'})
async function complete(total=2100) {return db.query(`SELECT complete_checkout('evt_one',$1,'cs_two','pi_two','ch_two',2000,$2,100,'usd',$3)`,[second.order.id,total,address])}
await denied(()=>complete(2200))
await complete();await complete()
await db.query(`SELECT release_checkout($1,'cs_two')`,[second.order.id])
await equal('SELECT inventory_count FROM products WHERE id=$1',8,[product])
await equal('SELECT count(*)::int FROM payouts WHERE order_id=$1',1,[second.order.id])
await equal('SELECT count(*)::int FROM notification_outbox WHERE order_id=$1',2,[second.order.id])
await db.exec(`RESET ROLE; SET ROLE anon`)
await equal('SELECT count(*)::int FROM vendors',0)
await equal('SELECT count(*)::int FROM profiles',0)
await equal('SELECT count(*)::int FROM vendor_directory',1)
await equal('SELECT count(*)::int FROM products',1)
await denied(()=>db.query(`SELECT reserve_checkout($1,$2,$3,$4,false)`,[buyer,key,JSON.stringify(cart),'buyer@example.invalid']))
await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${seller}',false)`)
await equal(`SELECT jsonb_array_length(vendor_fulfillment_orders())`,1)
const item=second.items[0].id
await denied(()=>db.query(`SELECT update_fulfillment($1,'delivered')`,[item]))
await denied(()=>db.query(`SELECT update_fulfillment($1,'shipped','x','usps')`,[item]))
await db.query(`SELECT update_fulfillment($1,'shipped','TRACK1234','usps')`,[item])
await db.query(`SELECT update_fulfillment($1,'delivered')`,[item])
await equal('SELECT delivery_confirmed_at FROM order_items WHERE id=$1',null,[item])
await db.exec(`SELECT set_config('request.jwt.claim.sub','${buyer}',false)`)
await denied(()=>db.query(`SELECT update_fulfillment($1,'shipped','TRACKX','ups')`,[item]))
const ret=(await db.query(`SELECT to_jsonb(request_return($1,'Does not fit','Unused with tags')) r`,[item])).rows[0].r
await denied(()=>db.query(`SELECT request_return($1,'Does not fit','Unused')`,[item]))
await equal('SELECT return_status FROM order_items WHERE id=$1','requested',[item])
await denied(()=>db.query(`SELECT decide_return($1,'approved',null)`,[ret.id]))
await db.exec(`SELECT set_config('request.jwt.claim.sub','${seller}',false)`)
await db.query(`SELECT decide_return($1,'approved','Return instructions supplied')`,[ret.id])
await equal('SELECT return_status FROM order_items WHERE id=$1','approved',[item])
await denied(()=>db.query(`SELECT decide_return($1,'denied','Changed mind')`,[ret.id]))
await denied(()=>db.query(`SELECT receive_return($1,'Arrived intact')`,[ret.id]))
await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE service_role`)
await equal('SELECT count(*)::int FROM claim_notifications(1)',1)
await equal("SELECT count(*)::int FROM notification_outbox WHERE status='sending'",1)
await db.exec(`UPDATE notification_outbox SET status='failed',first_attempt_at=now()-interval '24 hours'`)
await equal('SELECT count(*)::int FROM claim_notifications(20)',0)

await db.exec(`RESET ROLE; UPDATE profiles SET role='admin' WHERE id='${buyer}'; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${seller}',false)`)
const payout=(await db.query(`SELECT id FROM payouts WHERE order_id=$1`,[second.order.id])).rows[0].id
await denied(()=>db.query(`SELECT prepare_financial_operation('transfer',$1)`,[payout]))
await db.exec(`SELECT set_config('request.jwt.claim.sub','${buyer}',false)`)
await denied(()=>db.query(`SELECT prepare_financial_operation('refund',$1)`,[ret.id]))
await db.query(`SELECT receive_return($1,'All units received unused with tags')`,[ret.id])
const refundOp=(await db.query(`SELECT to_jsonb(prepare_financial_operation('refund',$1)) f`,[ret.id])).rows[0].f
assert.equal(refundOp.amount_cents,2100);checks++
assert.equal((await db.query(`SELECT to_jsonb(prepare_financial_operation('refund',$1)) f`,[ret.id])).rows[0].f.id,refundOp.id);checks++
await denied(()=>db.query(`SELECT prepare_financial_operation('transfer',$1)`,[payout]))
await denied(()=>db.query(`SELECT finish_financial_operation($1,'re_test')`,[refundOp.id]))
await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE service_role`)
await db.query(`SELECT finish_financial_operation($1,'re_test')`,[refundOp.id]);await db.query(`SELECT finish_financial_operation($1,'re_test')`,[refundOp.id])
await equal(`SELECT status FROM return_requests WHERE id=$1`,'completed',[ret.id])
await equal(`SELECT amount::text FROM payouts WHERE id=$1`,'0.00',[payout])
await equal(`SELECT inventory_count FROM products WHERE id=$1`,8,[product])
await denied(()=>db.query(`SELECT finish_financial_operation($1,'re_other')`,[refundOp.id]))
const third=await reserve('00000000-0000-0000-0000-000000000006')
await db.query(`UPDATE orders SET checkout_session_id='cs_three' WHERE id=$1`,[third.order.id])
await db.query(`SELECT complete_checkout('evt_three',$1,'cs_three','pi_three','ch_three',2000,2100,100,'usd',$2)`,[third.order.id,address])
const payout3=(await db.query(`SELECT id FROM payouts WHERE order_id=$1`,[third.order.id])).rows[0].id
await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${buyer}',false)`)
await denied(()=>db.query(`SELECT prepare_financial_operation('transfer',$1)`,[payout3]))
await db.query(`UPDATE vendors SET commercial_terms_confirmed=true WHERE id=$1`,[vendor])
await denied(()=>db.query(`SELECT prepare_financial_operation('transfer',$1)`,[payout3]))
await db.query(`SELECT update_fulfillment($1,'shipped','TRACKTHREE','usps')`,[third.items[0].id])
await db.query(`SELECT update_fulfillment($1,'delivered')`,[third.items[0].id])
const transferOp=(await db.query(`SELECT to_jsonb(prepare_financial_operation('transfer',$1)) f`,[payout3])).rows[0].f
assert.equal(transferOp.amount_cents,1500);checks++
await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE service_role`)
await db.query(`SELECT finish_financial_operation($1,'tr_test')`,[transferOp.id]);await db.query(`SELECT finish_financial_operation($1,'tr_test')`,[transferOp.id])
await equal(`SELECT stripe_transfer_id FROM payouts WHERE id=$1`,'tr_test',[payout3])
await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${buyer}',false)`)
const return3=(await db.query(`SELECT to_jsonb(request_return($1,'Does not fit','Unused')) r`,[third.items[0].id])).rows[0].r
await db.query(`SELECT decide_return($1,'approved','Return all units')`,[return3.id]);await db.query(`SELECT receive_return($1,'All units received in good condition')`,[return3.id])
const refund3=(await db.query(`SELECT to_jsonb(prepare_financial_operation('refund',$1)) f`,[return3.id])).rows[0].f
assert.equal(refund3.transfer_id,'tr_test');checks++
assert.equal(refund3.vendor_cents,1500);checks++
await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE service_role`)
await denied(()=>db.query(`SELECT finish_financial_operation($1,'re_after_transfer')`,[refund3.id]))
await db.query(`UPDATE financial_operations SET reversal_id='trr_test' WHERE id=$1`,[refund3.id])
await db.query(`SELECT finish_financial_operation($1,'re_after_transfer')`,[refund3.id])
await equal(`SELECT reversed_cents::int FROM payouts WHERE id=$1`,1500,[payout3])
await equal(`SELECT refunded_amount_cents::int FROM orders WHERE id=$1`,2100,[third.order.id])

await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${seller}',false)`)
await denied(()=>db.query(`SELECT save_launch_configuration('{}')`))
await denied(()=>db.query(`SELECT confirm_vendor_terms($1,20)`,[vendor]))
await db.exec(`SELECT set_config('request.jwt.claim.sub','${buyer}',false)`)
await denied(()=>db.query(`SELECT save_launch_configuration('{"checkout_mode":"live","return_window_days":30,"policies_confirmed":false}')`))
await denied(()=>db.query(`SELECT confirm_vendor_terms($1,100)`,[vendor]))
await denied(()=>db.query(`SELECT confirm_vendor_terms($1,99.999)`,[vendor]))
await denied(()=>db.query(`SELECT confirm_vendor_terms($1,1.234)`,[vendor]))
await db.query(`SELECT save_launch_configuration($1)`,[JSON.stringify({checkout_mode:'test',return_window_days:14,policies_confirmed:true,company_name:'Test Company',support_email:'support@example.invalid',return_condition:'Unused items in original packaging with tags.'})])
await equal(`SELECT (value->>'window_days')::int FROM site_settings WHERE key='return_policy'`,14)
await db.query(`SELECT confirm_vendor_terms($1,20)`,[vendor])
await equal(`SELECT commission_rate::text FROM vendors WHERE id=$1`,'0.2000',[vendor])

await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)`)
const sellerTwo='00000000-0000-0000-0000-000000000099'
await db.query(`INSERT INTO auth.users VALUES($1,'secondbrand@example.invalid','{}')`,[sellerTwo])
const vendorTwo=(await db.query(`INSERT INTO vendors(user_id,business_name,slug,status,stripe_onboarding_complete,stripe_account_id,commercial_terms_confirmed) VALUES($1,'Second Brand','second-brand','approved',true,'acct_two',true) RETURNING id`,[sellerTwo])).rows[0].id
const productTwo=(await db.query(`INSERT INTO products(vendor_id,category_id,title,slug,price,status,inventory_count) VALUES($1,(SELECT id FROM categories LIMIT 1),'Second item','second-item',15,'approved',10) RETURNING id`,[vendorTwo])).rows[0].id
await db.exec('SET ROLE service_role')
const mixed=await reserve('00000000-0000-0000-0000-000000000007',[{product_id:product,variant_id:null,quantity:1},{product_id:productTwo,variant_id:null,quantity:1}])
await db.query(`UPDATE orders SET checkout_session_id='cs_mixed' WHERE id=$1`,[mixed.order.id])
await db.query(`SELECT complete_checkout('evt_mixed',$1,'cs_mixed','pi_mixed','ch_mixed',2500,2625,125,'usd',$2)`,[mixed.order.id,address])
await equal(`SELECT count(*)::int FROM payouts WHERE order_id=$1`,2,[mixed.order.id])
await equal(`SELECT sum(tax_cents)::int FROM order_items WHERE order_id=$1`,125,[mixed.order.id])
const lineOne=mixed.items.find(i=>i.vendor_id===vendor),lineTwo=mixed.items.find(i=>i.vendor_id===vendorTwo)
await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${sellerTwo}',false)`)
await equal(`SELECT jsonb_array_length(vendor_fulfillment_orders())`,1)
await denied(()=>db.query(`SELECT update_fulfillment($1,'shipped','WRONGOWNER','ups')`,[lineOne.id]))
await db.query(`SELECT update_fulfillment($1,'shipped','BRANDTWO','ups')`,[lineTwo.id])
await db.exec(`SELECT set_config('request.jwt.claim.sub','${buyer}',false)`)
await equal(`SELECT status FROM orders WHERE id=$1`,'processing',[mixed.order.id])
await db.query(`SELECT update_fulfillment($1,'shipped','BRANDONE','usps')`,[lineOne.id])
await equal(`SELECT status FROM orders WHERE id=$1`,'shipped',[mixed.order.id])
await db.query(`SELECT update_fulfillment($1,'delivered')`,[lineOne.id])
await equal(`SELECT status FROM orders WHERE id=$1`,'shipped',[mixed.order.id])
await db.query(`SELECT update_fulfillment($1,'delivered')`,[lineTwo.id])
await equal(`SELECT status FROM orders WHERE id=$1`,'delivered',[mixed.order.id])

await denied(()=>db.query(`SELECT request_flash_deal($1,20,now()+interval '1 day',now()+interval '4 days')`,[productTwo]))
await db.exec(`SELECT set_config('request.jwt.claim.sub','${sellerTwo}',false)`)
await denied(()=>db.query(`SELECT request_flash_deal($1,90,now()+interval '1 day',now()+interval '4 days')`,[productTwo]))
await denied(()=>db.query(`SELECT request_flash_deal($1,20,now()+interval '1 day',now()+interval '2 days')`,[productTwo]))
const deal=(await db.query(`SELECT to_jsonb(request_flash_deal($1,20,now()+interval '1 day',now()+interval '4 days')) d`,[productTwo])).rows[0].d
assert.equal(deal.sale_price,12);checks++
await denied(()=>db.query(`SELECT request_flash_deal($1,20,now()+interval '2 days',now()+interval '5 days')`,[productTwo]))
await denied(()=>db.query(`SELECT review_flash_deal($1,'approved',null)`,[deal.id]))
await db.exec(`SELECT set_config('request.jwt.claim.sub','${buyer}',false)`)
await db.query(`SELECT review_flash_deal($1,'approved',null)`,[deal.id])
await equal(`SELECT effective_product_price($1)::text`,'15.00',[productTwo])
await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)`)
await db.query(`UPDATE deals SET starts_at=now()-interval '1 day',ends_at=now()+interval '2 days' WHERE id=$1`,[deal.id])
await db.exec('SET ROLE anon')
await equal(`SELECT price::text FROM catalog_products WHERE id=$1`,'12.00',[productTwo])
await equal(`SELECT compare_at_price::text FROM catalog_products WHERE id=$1`,'15.00',[productTwo])
await db.exec('RESET ROLE; SET ROLE service_role')
const discounted=await reserve('00000000-0000-0000-0000-000000000008',[{product_id:productTwo,variant_id:null,quantity:1}])
assert.equal(discounted.items[0].unit_price,12);checks++
await equal(`SELECT price::text FROM products WHERE id=$1`,'15.00',[productTwo])
await denied(()=>db.query(`SELECT link_checkout_session($1,'cs_discount',1500,'usd',false,null)`,[discounted.order.id]))
await denied(()=>db.query(`SELECT link_checkout_session($1,'cs_discount',1200,'usd',true,null)`,[discounted.order.id]))
await db.query(`SELECT link_checkout_session($1,'cs_discount',1200,'usd',false,null)`,[discounted.order.id])
await db.query(`SELECT link_checkout_session($1,'cs_discount',1200,'usd',false,null)`,[discounted.order.id])
await denied(()=>db.query(`SELECT link_checkout_session($1,'cs_other',1200,'usd',false,null)`,[discounted.order.id]))
await db.exec('RESET ROLE')
await db.query(`UPDATE deals SET ends_at=now() WHERE id=$1`,[deal.id])
await db.exec('SET ROLE anon')
await equal(`SELECT price::text FROM catalog_products WHERE id=$1`,'15.00',[productTwo])
await denied(()=>db.query(`SELECT link_checkout_session($1,'cs_discount',1200,'usd',false,null)`,[discounted.order.id]))
await db.exec(`RESET ROLE; UPDATE deals SET ends_at=now()+interval '2 days' WHERE id='${deal.id}'; UPDATE products SET price=16 WHERE id='${productTwo}'`)
await equal(`SELECT status FROM deals WHERE id=$1`,'rejected',[deal.id])
await equal(`SELECT effective_product_price($1)::text`,'16.00',[productTwo])

await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE anon`)
await equal(`SELECT count(*)::int FROM public_profiles`,0)
await denied(()=>db.query(`INSERT INTO newsletter_subscribers(email) VALUES('bypass@example.invalid')`))
await denied(()=>db.query(`SELECT capture_public_message('contact','person@example.invalid','Person','other','Hello support team')`))
await denied(()=>db.query(`SELECT save_verified_review($1,$2,5,'Forged',false)`,[buyer,product]))
await db.exec('RESET ROLE; SET ROLE service_role')
for(let n=0;n<3;n++)await db.query(`SELECT capture_public_message('contact','person@example.invalid','Person','other','Hello support team')`)
await denied(()=>db.query(`SELECT capture_public_message('contact','person@example.invalid','Person','other','Fourth message now')`))
await equal(`SELECT count(*)::int FROM contact_messages`,3)
await db.query(`SELECT capture_public_message('newsletter','Person@Example.invalid')`)
await db.query(`SELECT capture_public_message('newsletter','person@example.invalid')`)
await equal(`SELECT count(*)::int FROM newsletter_subscribers WHERE email='person@example.invalid'`,1)
await denied(()=>db.query(`SELECT capture_public_message('newsletter','bad email')`))
await denied(()=>db.query(`SELECT save_verified_review($1,$2,5,'Not my purchase',false)`,[sellerTwo,product]))
await db.query(`SELECT save_verified_review($1,$2,4,'Verified buyer review',false)`,[buyer,product])
await equal(`SELECT rating_count FROM products WHERE id=$1`,1,[product])
await db.exec('RESET ROLE; SET ROLE anon')
await equal(`SELECT count(*)::int FROM public_profiles`,1)
await db.exec('RESET ROLE; SET ROLE service_role')
await equal(`SELECT rating_avg::text FROM products WHERE id=$1`,'4.00',[product])
await denied(()=>db.query(`SELECT save_verified_review($1,$2,5,'Duplicate',false)`,[buyer,product]))
await db.query(`SELECT save_verified_review($1,$2,NULL,NULL,true)`,[buyer,product])
await equal(`SELECT rating_count FROM products WHERE id=$1`,0,[product])
await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${sellerTwo}',false)`)
await equal(`SELECT count(*)::int FROM contact_messages`,0)
await denied(()=>db.query(`INSERT INTO reviews(product_id,customer_id,rating) VALUES($1,$2,5)`,[product,sellerTwo]))

await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE service_role`)
await equal(`SELECT (policy_snapshot->>'return_window_days')::int FROM orders WHERE id=$1`,14,[mixed.order.id])
await db.exec(`RESET ROLE; UPDATE site_settings SET value=jsonb_set(value,'{return_window_days}','7') WHERE key='launch_config'`)
await equal(`SELECT (policy_snapshot->>'return_window_days')::int FROM orders WHERE id=$1`,14,[mixed.order.id])
await db.exec(`RESET ROLE; SET ROLE anon`)
await denied(()=>db.query('SELECT * FROM claim_checkout_recovery(3)'))
await db.exec(`RESET ROLE; SET ROLE authenticated`)
await denied(()=>db.query('SELECT * FROM claim_checkout_recovery(3)'))
await db.exec(`RESET ROLE; UPDATE orders SET created_at=now()-interval '1 hour' WHERE reservation_state='reserved'; SET ROLE service_role`)
const batch=(await db.query('SELECT * FROM claim_checkout_recovery(100)')).rows
assert.ok(batch.length>0 && batch.length<=3);checks++
const again=(await db.query('SELECT * FROM claim_checkout_recovery(3)')).rows
assert.ok(again.every(o=>!batch.some(b=>b.id===o.id)));checks++
for(const o of batch) await equal(`SELECT reservation_state FROM orders WHERE id=$1`,'reserved',[o.id])
await db.exec(`RESET ROLE; UPDATE orders SET recovery_checked_at=now()-interval '31 minutes' WHERE reservation_state='reserved'; SET ROLE service_role`)
assert.ok((await db.query('SELECT * FROM claim_checkout_recovery(3)')).rows.length>0);checks++
await db.exec(`RESET ROLE; SET ROLE service_role`)
await equal(`SELECT count(*)::int FROM notification_outbox WHERE dedupe_key='financial-confirmed:'||$1::text`,1,[refund3.id])
await db.query(`SELECT finish_financial_operation($1,'re_after_transfer')`,[refund3.id])
await equal(`SELECT count(*)::int FROM notification_outbox WHERE dedupe_key='financial-confirmed:'||$1::text`,1,[refund3.id])
await equal(`SELECT kind FROM notification_outbox WHERE dedupe_key='financial-confirmed:'||$1::text`,'return_refunded',[refund3.id])
console.log(`${checks} checkout and fulfillment checks passed`)
await db.close()
