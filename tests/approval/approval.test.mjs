import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
const root = new URL('../../', import.meta.url)
await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
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
await db.exec(readFileSync(new URL('supabase/migrations/010_product_workflow.sql',root),'utf8'))
await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;`)
const admin='00000000-0000-0000-0000-000000000001', owner='00000000-0000-0000-0000-000000000002', other='00000000-0000-0000-0000-000000000003'
for(const id of [admin,owner,other]) await db.query(`INSERT INTO auth.users VALUES ($1, 'test@example.invalid', '{}')`,[id])
await db.query(`UPDATE profiles SET role='admin' WHERE id=$1`,[admin])
async function as(id,role='authenticated') {await db.exec('RESET ROLE');await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[id]);await db.exec(`SET ROLE ${role}`)}
async function denied(sql,params=[]) {await assert.rejects(db.query(sql,params)); checks++}
let checks=0
await as(owner)
await denied(`UPDATE profiles SET role='admin' WHERE id=$1`,[owner])
await denied(`INSERT INTO vendors(user_id,business_name,slug,status) VALUES ($1,'Bad','bad','approved')`,[owner])
const v=(await db.query(`INSERT INTO vendors(user_id,business_name,slug,sample_images) VALUES ($1,'Shop','shop',ARRAY['https://example.invalid/sample.jpg']) RETURNING id`,[owner])).rows[0].id
await denied(`SELECT moderate_vendor($1,'approved')`,[v])
await denied(`UPDATE vendors SET status='approved' WHERE id=$1`,[v])
await as(admin)
// Simulate a failure in the second write; the vendor decision must roll back.
await db.exec(`RESET ROLE; CREATE FUNCTION fail_role_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated role failure'; END $$;
CREATE TRIGGER fail_role_test BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fail_role_test(); SET ROLE authenticated;`)
await denied(`SELECT moderate_vendor($1,'approved')`,[v])
assert.equal((await db.query(`SELECT status FROM vendors WHERE id=$1`,[v])).rows[0].status,'pending');checks++
await db.exec('RESET ROLE; DROP TRIGGER fail_role_test ON profiles; DROP FUNCTION fail_role_test(); SET ROLE authenticated;')
await denied(`SELECT moderate_vendor($1,'bogus')`,[v])
await denied(`SELECT moderate_vendor('00000000-0000-0000-0000-000000000099','approved')`)
await db.query(`SELECT moderate_vendor($1,'approved')`,[v])
assert.equal((await db.query(`SELECT role FROM profiles WHERE id=$1`,[owner])).rows[0].role,'vendor');checks++
await as(owner)
const cat=(await db.query('SELECT id FROM categories LIMIT 1')).rows[0].id
await denied(`INSERT INTO products(vendor_id,category_id,title,slug,price,status) VALUES ($1,$2,'Bad','bad',10,'approved')`,[v,cat])
const p=(await db.query(`INSERT INTO products(vendor_id,category_id,title,slug,price,status) VALUES ($1,$2,'Item','item',10,'pending') RETURNING id`,[v,cat])).rows[0].id
await denied(`UPDATE products SET status='approved' WHERE id=$1`,[p])
await as(other)
assert.equal((await db.query(`UPDATE products SET status='approved' WHERE id=$1 RETURNING id`,[p])).rows.length,0);checks++
await as(admin)
await db.query(`UPDATE products SET status='approved' WHERE id=$1`,[p])
await as('', 'anon')
assert.equal((await db.query(`SELECT id FROM products WHERE id=$1`,[p])).rows.length,1);checks++
await as(owner)
await db.query(`UPDATE products SET inventory_count=5 WHERE id=$1`,[p])
assert.equal((await db.query(`SELECT status FROM products WHERE id=$1`,[p])).rows[0].status,'approved');checks++
await db.query(`UPDATE products SET title='Changed' WHERE id=$1`,[p])
assert.equal((await db.query(`SELECT status FROM products WHERE id=$1`,[p])).rows[0].status,'pending');checks++
await as(admin);await db.query(`UPDATE products SET status='approved' WHERE id=$1`,[p])
await as(owner);await db.query(`INSERT INTO product_images(product_id,url) VALUES ($1,'https://example.invalid/image.jpg')`,[p])
assert.equal((await db.query(`SELECT status FROM products WHERE id=$1`,[p])).rows[0].status,'pending');checks++
await as(admin);await db.query(`UPDATE products SET status='approved' WHERE id=$1`,[p]);await db.query(`SELECT moderate_vendor($1,'frozen')`,[v])
await as('', 'anon');assert.equal((await db.query(`SELECT id FROM products WHERE id=$1`,[p])).rows.length,0);checks++
assert.equal((await db.query(`SELECT id FROM product_images WHERE product_id=$1`,[p])).rows.length,0);checks++
await as(owner);await denied(`UPDATE products SET title='Frozen edit' WHERE id=$1`,[p])
await denied(`INSERT INTO product_variants(product_id,name,type,value) VALUES ($1,'Size','size','M')`,[p])
await as(admin);await denied(`UPDATE products SET status='approved' WHERE id=$1`,[p])
await db.query(`SELECT moderate_vendor($1,'approved')`,[v])
await as('', 'anon');assert.equal((await db.query(`SELECT id FROM products WHERE id=$1`,[p])).rows.length,1);checks++
await as(owner)
await denied(`SELECT feature_vendor($1)`,[v])
await denied(`UPDATE vendors SET is_featured=true WHERE id=$1`,[v])
await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('vendor-assets',$1)`,[`products/${owner}/test.png`]);checks++
await denied(`INSERT INTO storage.objects(bucket_id,name) VALUES ('vendor-assets',$1)`,[`products/${other}/test.png`])
await as(other)
assert.equal((await db.query(`SELECT * FROM storage.objects`)).rows.length,0);checks++
await as(admin)
await db.query(`SELECT feature_vendor($1)`,[v])
assert.equal((await db.query(`SELECT is_featured FROM vendors WHERE id=$1`,[v])).rows[0].is_featured,true);checks++
await db.query(`SELECT feature_vendor(null)`)
assert.equal((await db.query(`SELECT is_featured FROM vendors WHERE id=$1`,[v])).rows[0].is_featured,false);checks++
console.log(`${checks} approval and access-control checks passed, including the product workflow migration.`)
await db.close()
