import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
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
await db.exec('GRANT USAGE ON SCHEMA public,auth TO service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;')

const owner='00000000-0000-0000-0000-000000000001'
await db.query(`INSERT INTO auth.users VALUES ($1,'test@example.invalid','{}')`,[owner])
const vendor=(await db.query(`INSERT INTO vendors(user_id,business_name,slug,status,commission_rate) VALUES ($1,'Brand','brand','approved',0.25) RETURNING id`,[owner])).rows[0].id
const cat=(await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id
const product=(await db.query(`INSERT INTO products(vendor_id,category_id,title,slug,price,status,inventory_count) VALUES ($1,$2,'Item','item',10,'approved',10) RETURNING id`,[vendor,cat])).rows[0].id
const variant=(await db.query(`INSERT INTO product_variants(product_id,name,type,value,inventory_count) VALUES ($1,'Size','size','M',10) RETURNING id`,[product])).rows[0].id
async function order(payment,qty=2) {
 const id=(await db.query(`INSERT INTO orders(customer_id,subtotal,total,stripe_payment_id) VALUES ($1,$2,$2,$3) RETURNING id`,[owner,qty*10,payment])).rows[0].id
 await db.query(`INSERT INTO order_items(order_id,product_id,variant_id,vendor_id,quantity,unit_price) VALUES ($1,$2,$3,$4,$5,10)`,[id,product,variant,vendor,qty])
 return id
}
const id=await order('pi_one')
async function evt(event,type='payment_intent.succeeded',payment='pi_one',amount=2000,refund=null,currency='usd') {
 return db.query('SELECT process_payment_event($1,$2,$3,$4,$5,$6)',[event,type,payment,amount,refund,currency])
}
let checks=0
async function equal(sql,value,params=[]) {assert.equal(Object.values((await db.query(sql,params)).rows[0])[0],value);checks++}
async function denied(fn) {await assert.rejects(fn);checks++}
await db.exec('SET ROLE authenticated')
await denied(()=>evt('evt_forbidden'))
await db.exec('RESET ROLE; SET ROLE service_role')
await denied(()=>evt('evt_missing','payment_intent.succeeded','pi_missing'))
await equal(`SELECT count(*)::int FROM stripe_events`,0)
await denied(()=>evt('evt_amount','payment_intent.succeeded','pi_one',1999))
await equal(`SELECT inventory_count FROM products WHERE id=$1`,10,[product])
await equal(`SELECT count(*)::int FROM stripe_events`,0)
await evt('evt_paid')
await evt('evt_paid') // Same event delivered twice.
await evt('evt_paid_again') // Different event for the same successful payment.
await equal(`SELECT inventory_count FROM products WHERE id=$1`,8,[product])
await equal(`SELECT inventory_count FROM product_variants WHERE id=$1`,8,[variant])
await equal(`SELECT sold_count FROM products WHERE id=$1`,2,[product])
await equal(`SELECT count(*)::int FROM payouts WHERE order_id=$1`,1,[id])
await equal(`SELECT amount::text FROM payouts WHERE order_id=$1`,'15.00',[id])
await equal(`SELECT total_revenue::text FROM vendors WHERE id=$1`,'15.00',[vendor])
await evt('evt_late_failure','payment_intent.payment_failed')
await equal(`SELECT status FROM orders WHERE id=$1`,'processing',[id])
await evt('evt_partial','charge.refunded','pi_one',2000,500)
await evt('evt_partial','charge.refunded','pi_one',2000,500)
await evt('evt_old_partial','charge.refunded','pi_one',2000,200)
await equal(`SELECT refunded_amount_cents::int FROM orders WHERE id=$1`,500,[id])
await equal(`SELECT status FROM orders WHERE id=$1`,'processing',[id])
await equal(`SELECT reconciliation_required FROM payouts WHERE order_id=$1`,true,[id])
await equal(`SELECT inventory_count FROM products WHERE id=$1`,8,[product])
await evt('evt_full','charge.refunded','pi_one',2000,2000)
await evt('evt_full_again','charge.refunded','pi_one',2000,2000)
await equal(`SELECT status FROM orders WHERE id=$1`,'refunded',[id])
await equal(`SELECT refunded_amount_cents::int FROM orders WHERE id=$1`,2000,[id])
await equal(`SELECT inventory_count FROM product_variants WHERE id=$1`,8,[variant])
await equal(`SELECT status FROM order_items WHERE order_id=$1`,'refunded',[id])
// A failure halfway through stock updates must roll back the event and all writes.
const second=await order('pi_two',1)
await db.query(`UPDATE product_variants SET inventory_count=0 WHERE id=$1`,[variant])
await denied(()=>evt('evt_retry','payment_intent.succeeded','pi_two',1000))
await equal(`SELECT inventory_count FROM products WHERE id=$1`,8,[product])
await equal(`SELECT count(*)::int FROM stripe_events WHERE event_id='evt_retry'`,0)
await equal(`SELECT count(*)::int FROM payouts WHERE order_id=$1`,0,[second])
await db.query(`UPDATE product_variants SET inventory_count=8 WHERE id=$1`,[variant])
await evt('evt_retry','payment_intent.succeeded','pi_two',1000)
await equal(`SELECT inventory_count FROM products WHERE id=$1`,7,[product])
await equal(`SELECT count(*)::int FROM payouts WHERE order_id=$1`,1,[second])
const third=await order('pi_three',1)
await denied(()=>evt('evt_early_refund','charge.refunded','pi_three',1000,500))
await equal(`SELECT count(*)::int FROM stripe_events WHERE event_id='evt_early_refund'`,0)
await evt('evt_early_failure','payment_intent.payment_failed','pi_three')
await equal(`SELECT status FROM orders WHERE id=$1`,'pending',[third])
await evt('evt_paid_three','payment_intent.succeeded','pi_three',1000)
await evt('evt_early_refund','charge.refunded','pi_three',1000,500)
await equal(`SELECT refunded_amount_cents::int FROM orders WHERE id=$1`,500,[third])
console.log(`${checks} payment accounting and rollback checks passed.`)
await db.close()
