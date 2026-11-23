BEGIN;
-- Older approved deals mutated product prices without a reliable restoration record.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM deals WHERE status='approved') THEN RAISE EXCEPTION 'Reconcile legacy approved deal base prices before applying migration 017'; END IF; END $$;
ALTER TABLE deals ADD COLUMN base_price numeric(10,2);
UPDATE deals SET status='rejected',is_active=false,admin_notes='Legacy request retired. Submit a new request with a verified base price.' WHERE status='pending';
DROP POLICY IF EXISTS "Vendors can create deals" ON deals;
DROP POLICY IF EXISTS "Vendors can update own pending deals" ON deals;
DROP POLICY IF EXISTS "Admins can manage deals" ON deals;
DROP POLICY IF EXISTS "Active deals are public" ON deals;
CREATE POLICY "Approved active deals are public" ON deals FOR SELECT USING((status='approved' AND is_active AND starts_at<=now() AND ends_at>now()) OR get_user_role()='admin');
CREATE FUNCTION request_flash_deal(product_arg uuid,percent_arg integer,start_arg timestamptz,end_arg timestamptz) RETURNS deals
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p products;d deals;
BEGIN
 SELECT * INTO p FROM products WHERE id=product_arg FOR UPDATE;
 IF auth.uid() IS NULL OR p.id IS NULL OR NOT EXISTS(SELECT 1 FROM vendors WHERE id=p.vendor_id AND user_id=auth.uid() AND status='approved') THEN RAISE EXCEPTION 'Approved product owner required' USING ERRCODE='42501'; END IF;
 IF p.status<>'approved' OR EXISTS(SELECT 1 FROM product_variants WHERE product_id=p.id) THEN RAISE EXCEPTION 'Choose an approved product without variants for a flash deal'; END IF;
 IF percent_arg IS NULL OR percent_arg NOT BETWEEN 5 AND 80 OR start_arg IS NULL OR end_arg IS NULL OR start_arg<now() OR end_arg-start_arg NOT BETWEEN interval '3 days' AND interval '6 days' THEN RAISE EXCEPTION 'Choose a future start, 3–6 day duration and 5–80 percent discount'; END IF;
 IF round(p.price*(1-percent_arg/100.0),2)<=0 THEN RAISE EXCEPTION 'Sale price must be at least one cent'; END IF;
 IF EXISTS(SELECT 1 FROM deals WHERE product_id=p.id AND status IN ('pending','approved') AND starts_at<end_arg AND ends_at>start_arg) THEN RAISE EXCEPTION 'This product already has an overlapping deal'; END IF;
 INSERT INTO deals(product_id,vendor_id,discount_percent,base_price,sale_price,starts_at,ends_at,is_active,status) VALUES(p.id,p.vendor_id,percent_arg,p.price,round(p.price*(1-percent_arg/100.0),2),start_arg,end_arg,false,'pending') RETURNING * INTO d;
 RETURN d;
END $$;
CREATE FUNCTION review_flash_deal(deal_arg uuid,status_arg text,notes_arg text DEFAULT NULL) RETURNS deals
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p products;d deals;
BEGIN
 IF auth.uid() IS NULL OR get_user_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM deals WHERE id=deal_arg;
 SELECT * INTO p FROM products WHERE id=d.product_id FOR UPDATE;
 SELECT * INTO d FROM deals WHERE id=deal_arg FOR UPDATE;
 IF d.id IS NULL OR status_arg IS NULL OR status_arg NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid review'; END IF;
 IF status_arg='approved' THEN
  IF d.status<>'pending' OR d.starts_at<now() OR d.ends_at<=now() OR p.status<>'approved' OR p.price IS DISTINCT FROM d.base_price OR NOT EXISTS(SELECT 1 FROM vendors WHERE id=p.vendor_id AND status='approved') OR EXISTS(SELECT 1 FROM product_variants WHERE product_id=p.id) THEN RAISE EXCEPTION 'Product or schedule changed; submit a new deal'; END IF;
 END IF;
 UPDATE deals SET status=status_arg,is_active=(status_arg='approved'),approved_by=auth.uid(),approved_at=now(),admin_notes=left(notes_arg,3000) WHERE id=d.id RETURNING * INTO d;
 RETURN d;
END $$;
CREATE FUNCTION invalidate_product_deals() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.price IS DISTINCT FROM OLD.price OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status<>'approved') THEN UPDATE deals SET status='rejected',is_active=false,admin_notes='Product changed. Submit a new deal after product review.' WHERE product_id=NEW.id AND status IN ('pending','approved'); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invalidate_product_deals AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION invalidate_product_deals();
CREATE FUNCTION effective_product_price(product_arg uuid) RETURNS numeric LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT coalesce((SELECT d.sale_price FROM deals d WHERE d.product_id=p.id AND d.status='approved' AND d.is_active AND d.starts_at<=now() AND d.ends_at>now() AND d.base_price=p.price AND NOT EXISTS(SELECT 1 FROM product_variants WHERE product_id=p.id) ORDER BY d.starts_at LIMIT 1),p.price)
 FROM products p WHERE p.id=product_arg;
$$;
CREATE VIEW catalog_products WITH (security_barrier=true) AS
 SELECT p.id,p.vendor_id,p.category_id,p.title,p.slug,p.description,
 effective_product_price(p.id) AS price,
 CASE WHEN effective_product_price(p.id)<p.price THEN p.price ELSE p.compare_at_price END AS compare_at_price,
 p.status,p.inventory_count,p.sold_count,p.is_preorder,p.drop_date,p.rating_avg,p.rating_count,p.created_at,p.updated_at,p.search_vector
 FROM products p WHERE p.status='approved' AND EXISTS(SELECT 1 FROM vendors v WHERE v.id=p.vendor_id AND v.status='approved');
GRANT SELECT ON catalog_products TO anon,authenticated;
REVOKE ALL ON FUNCTION request_flash_deal(uuid,integer,timestamptz,timestamptz),review_flash_deal(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_flash_deal(uuid,integer,timestamptz,timestamptz),review_flash_deal(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION reserve_checkout(customer_arg uuid,key_arg uuid,cart_arg jsonb,email_arg text,live_arg boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders; p products; v vendors; variant product_variants; line record; qty integer; cents bigint; subtotal_cents bigint:=0; config jsonb;
BEGIN
 IF key_arg IS NULL OR jsonb_typeof(cart_arg) IS DISTINCT FROM 'array' OR jsonb_array_length(cart_arg) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid cart'; END IF;
 -- Serialize duplicate requests for one customer, including the first insert.
 PERFORM 1 FROM profiles WHERE id=customer_arg FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
 SELECT * INTO o FROM orders WHERE customer_id=customer_arg AND checkout_key=key_arg;
 IF FOUND THEN
  IF o.checkout_cart IS DISTINCT FROM cart_arg OR o.checkout_livemode<>live_arg THEN RAISE EXCEPTION 'Checkout key already belongs to another cart'; END IF;
  RETURN jsonb_build_object('order',to_jsonb(o),'items',(SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.id) FROM order_items oi WHERE order_id=o.id));
 END IF;
 SELECT value INTO config FROM site_settings WHERE key='launch_config';
 IF coalesce(config->>'checkout_mode','disabled') NOT IN ('test','live') THEN RAISE EXCEPTION 'Checkout is not open yet'; END IF;
 IF live_arg AND (config->>'checkout_mode'<>'live' OR NOT coalesce((config->>'policies_confirmed')::boolean,false)) THEN RAISE EXCEPTION 'Live checkout is not enabled'; END IF;
 IF (SELECT count(*) FROM orders WHERE customer_id=customer_arg AND reservation_state='reserved')>=3 THEN RAISE EXCEPTION 'Finish or cancel an existing checkout before starting another'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(cart_arg) LOOP
  IF jsonb_typeof(line.value) IS DISTINCT FROM 'object' OR (line.value->>'quantity') IS NULL
    OR (line.value->>'quantity') !~ '^[1-9][0-9]{0,2}$' OR (line.value->>'quantity')::int>99 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
 END LOOP;
 INSERT INTO orders(customer_id,status,subtotal,tax,shipping,total,checkout_key,checkout_cart,reservation_state,reservation_expires_at,checkout_email,checkout_livemode)
 VALUES(customer_arg,'pending',0,0,0,0,key_arg,cart_arg,'reserved',now()+interval '35 minutes',email_arg,live_arg) RETURNING * INTO o;
 -- Lock products and variants in a stable order and reserve aggregated quantities.
 FOR line IN SELECT (value->>'product_id')::uuid product_id,sum((value->>'quantity')::int)::int quantity
   FROM jsonb_array_elements(cart_arg) GROUP BY 1 ORDER BY 1 LOOP
  SELECT * INTO p FROM products WHERE id=line.product_id FOR UPDATE;
  IF NOT FOUND OR p.status<>'approved' OR p.inventory_count<line.quantity THEN RAISE EXCEPTION 'A product is unavailable or has insufficient stock'; END IF;
  SELECT * INTO v FROM vendors WHERE id=p.vendor_id;
  IF v.status<>'approved' OR NOT v.stripe_onboarding_complete OR v.stripe_account_id IS NULL OR (live_arg AND NOT v.commercial_terms_confirmed) THEN RAISE EXCEPTION 'A vendor is not ready to accept orders'; END IF;
  IF v.commission_rate<0 OR v.commission_rate>=1 THEN RAISE EXCEPTION 'Invalid vendor commission'; END IF;
  UPDATE products SET inventory_count=inventory_count-line.quantity WHERE id=p.id;
 END LOOP;
 FOR line IN SELECT nullif(value->>'variant_id','')::uuid variant_id,(value->>'product_id')::uuid product_id,sum((value->>'quantity')::int)::int quantity
   FROM jsonb_array_elements(cart_arg) WHERE nullif(value->>'variant_id','') IS NOT NULL GROUP BY 1,2 ORDER BY 1 LOOP
  SELECT * INTO variant FROM product_variants WHERE id=line.variant_id AND product_id=line.product_id FOR UPDATE;
  IF NOT FOUND OR variant.inventory_count<line.quantity THEN RAISE EXCEPTION 'Selected option is unavailable'; END IF;
  UPDATE product_variants SET inventory_count=inventory_count-line.quantity WHERE id=variant.id;
 END LOOP;
 FOR line IN SELECT value FROM jsonb_array_elements(cart_arg) LOOP
  SELECT * INTO p FROM products WHERE id=(line.value->>'product_id')::uuid;
  SELECT * INTO v FROM vendors WHERE id=p.vendor_id;
  variant:=NULL;
  IF nullif(line.value->>'variant_id','') IS NOT NULL THEN SELECT * INTO variant FROM product_variants WHERE id=(line.value->>'variant_id')::uuid AND product_id=p.id; END IF;
  cents:=round((effective_product_price(p.id)+coalesce(variant.price_adjustment,0))*100)::bigint; qty:=(line.value->>'quantity')::int;
  IF cents<=0 OR cents>99999999 THEN RAISE EXCEPTION 'Invalid product price'; END IF;
  subtotal_cents:=subtotal_cents+cents*qty;
  INSERT INTO order_items(order_id,product_id,variant_id,vendor_id,quantity,unit_price,status,commission_rate,product_title,variant_description)
  VALUES(o.id,p.id,variant.id,v.id,qty,cents/100.0,'pending',v.commission_rate,p.title,variant.name||': '||variant.value);
 END LOOP;
 IF subtotal_cents>99999999 THEN RAISE EXCEPTION 'Order is too large'; END IF;
 UPDATE orders SET subtotal=subtotal_cents/100.0,total=subtotal_cents/100.0 WHERE id=o.id RETURNING * INTO o;
 RETURN jsonb_build_object('order',to_jsonb(o),'items',(SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.id) FROM order_items oi WHERE order_id=o.id));
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
