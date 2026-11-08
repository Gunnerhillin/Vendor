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


await db.exec(readFileSync(new URL('supabase/migrations/010_product_workflow.sql',root),'utf8'))
const admin='00000000-0000-0000-0000-000000000001',owner='00000000-0000-0000-0000-000000000002',other='00000000-0000-0000-0000-000000000003'
for(const id of [admin,owner,other]) await db.query(`INSERT INTO auth.users VALUES ($1,'test@example.invalid','{}')`,[id])
await db.query(`UPDATE profiles SET role='admin' WHERE id=$1`,[admin])
for(const id of [owner,other]) await db.query(`INSERT INTO vendors(user_id,business_name,slug,status) VALUES($1::uuid,'Test',$1::text,'approved')`,[id])
const cat=(await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id
let checks=0
async function as(id,role='authenticated'){await db.exec('RESET ROLE');await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[id]);await db.exec(`SET ROLE ${role}`)}
async function save(id,payload){return (await db.query('SELECT to_jsonb(save_vendor_product($1,$2)) p',[id,JSON.stringify(payload)])).rows[0].p}
async function get(id){return (await db.query('SELECT to_jsonb(products) p FROM products WHERE id=$1',[id])).rows[0]?.p}
async function deny(fn){await assert.rejects(fn);checks++}
function eq(actual,expected){assert.deepEqual(actual,expected);checks++}
const base={title:'Same title',category_id:cat,price:10,inventory_count:3,status:'draft',images:[]}
await as('', 'anon');await deny(()=>save(null,base))
await as(owner)
let p=await save(null,base);eq(p.status,'draft')
const second=await save(null,base);assert.notEqual(p.slug,second.slug);checks++
await deny(()=>save(null,{...base,price:-1}))
await deny(()=>save(null,{...base,inventory_count:1.5}))
await deny(()=>save(null,{...base,compare_at_price:5}))
await deny(()=>save(null,{...base,title:' '}))
await deny(()=>save(null,{...base,status:'approved'}))
await deny(()=>save(p.id,{status:'pending',updated_at:p.updated_at}))
await deny(()=>save(p.id,{inventory_count:4,updated_at:'2000-01-01'}))
await as(other);await deny(()=>save(p.id,{...base,updated_at:p.updated_at}))
const otherPath=`products/${other}/test.jpg`
await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('vendor-assets',$1)`,[otherPath])
await as(owner)
await deny(()=>save(p.id,{images:[{url:'/api/media?bucket=vendor-assets&path='+encodeURIComponent(otherPath)}],updated_at:p.updated_at}))
const path=`products/${owner}/test.jpg`,url='/api/media?bucket=vendor-assets&path='+encodeURIComponent(path)
await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('vendor-assets',$1)`,[path])
p=await save(p.id,{description:'Real description',images:[{url}],updated_at:p.updated_at})
eq(p.status,'draft')
const oldSlug=p.slug
p=await save(p.id,{title:'Changed title',status:'pending',updated_at:p.updated_at});eq(p.status,'pending');eq(p.slug,oldSlug)
await deny(()=>db.query(`SELECT moderate_product($1,'approved',null,$2)`,[p.id,p.updated_at]))
await deny(()=>db.query(`UPDATE products SET moderation_note='Fake feedback' WHERE id=$1`,[p.id]))
await as(admin)
await deny(()=>db.query(`SELECT moderate_product($1,'rejected',' ',$2)`,[p.id,p.updated_at]))
await db.query(`SELECT moderate_product($1,'rejected','Please improve the photo',$2)`,[p.id,p.updated_at]);p=await get(p.id)
eq(p.moderation_note,'Please improve the photo')
await as(owner);p=await save(p.id,{status:'pending',updated_at:p.updated_at})
await as(admin);await deny(()=>db.query(`SELECT moderate_product($1,'approved',null,'2000-01-01')`,[p.id]))
await db.query(`SELECT moderate_product($1,'approved',null,$2)`,[p.id,p.updated_at]);p=await get(p.id);eq(p.moderation_note,null)
await as('', 'anon');eq((await get(p.id)).status,'approved')
await as(owner);p=await save(p.id,{inventory_count:7,updated_at:p.updated_at});eq(p.status,'approved');eq(p.inventory_count,7)
// A failure after deleting old images must roll back the whole edit.
await db.exec(`RESET ROLE; CREATE FUNCTION fail_image_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated image write failure'; END $$;
CREATE TRIGGER fail_image_test BEFORE INSERT ON product_images FOR EACH ROW EXECUTE FUNCTION fail_image_test(); SET ROLE authenticated;`)
await deny(()=>save(p.id,{title:'Must roll back',images:[{url}],updated_at:p.updated_at}))
eq((await get(p.id)).title,p.title)
eq((await db.query('SELECT count(*)::int c FROM product_images WHERE product_id=$1',[p.id])).rows[0].c,1)
await db.exec('RESET ROLE; DROP TRIGGER fail_image_test ON product_images; DROP FUNCTION fail_image_test(); SET ROLE authenticated;')
p=await save(p.id,{title:'New submitted title',updated_at:p.updated_at});eq(p.status,'pending')
await as('', 'anon');eq(await get(p.id),undefined)
await as(owner);p=await save(p.id,{status:'draft',updated_at:p.updated_at});eq(p.status,'draft')
await db.query('DELETE FROM products WHERE id=$1',[p.id]);eq(await get(p.id),undefined)
console.log(`${checks} product workflow, moderation, ownership and rollback checks passed.`)
await db.close()
