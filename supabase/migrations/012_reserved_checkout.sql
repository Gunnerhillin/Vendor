BEGIN;
CREATE OR REPLACE FUNCTION public.guard_product_moderation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = NEW.vendor_id
                   AND user_id = auth.uid() AND status = 'approved') THEN
      RAISE EXCEPTION 'An approved vendor is required' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('draft', 'pending') THEN
        RAISE EXCEPTION 'Products must await moderation' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
        RAISE EXCEPTION 'Cannot transfer product ownership' USING ERRCODE = '42501';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('draft', 'pending') THEN
        RAISE EXCEPTION 'Only administrators can approve products' USING ERRCODE = '42501';
      END IF;
      IF ROW(NEW.title, NEW.description, NEW.price, NEW.compare_at_price, NEW.category_id)
         IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD.price, OLD.compare_at_price, OLD.category_id) THEN
        IF NEW.status <> 'draft' THEN NEW.status := 'pending'; END IF;
      END IF;
    END IF;
  ELSIF NEW.status = 'approved' AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) AND NOT EXISTS
    (SELECT 1 FROM public.vendors WHERE id = NEW.vendor_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Approve the vendor before approving its products';
  END IF;
  RETURN NEW;
END $$;


ALTER TABLE orders ADD COLUMN checkout_key uuid;
ALTER TABLE orders ADD COLUMN checkout_cart jsonb;
ALTER TABLE orders ADD COLUMN checkout_session_id text UNIQUE;
ALTER TABLE orders ADD COLUMN checkout_url text;
ALTER TABLE orders ADD COLUMN reservation_state text CHECK(reservation_state IN ('reserved','paid','released'));
ALTER TABLE orders ADD COLUMN reservation_expires_at timestamptz;
ALTER TABLE orders ADD COLUMN checkout_email text;
ALTER TABLE orders ADD COLUMN checkout_livemode boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN payment_charge_id text;
CREATE UNIQUE INDEX orders_checkout_key ON orders(customer_id,checkout_key) WHERE checkout_key IS NOT NULL;
ALTER TABLE order_items ADD COLUMN tax_cents bigint NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN refunded_quantity integer NOT NULL DEFAULT 0;

CREATE FUNCTION reserve_checkout(customer_arg uuid,key_arg uuid,cart_arg jsonb,email_arg text,live_arg boolean)
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
  cents:=round((p.price+coalesce(variant.price_adjustment,0))*100)::bigint; qty:=(line.value->>'quantity')::int;
  IF cents<=0 OR cents>99999999 THEN RAISE EXCEPTION 'Invalid product price'; END IF;
  subtotal_cents:=subtotal_cents+cents*qty;
  INSERT INTO order_items(order_id,product_id,variant_id,vendor_id,quantity,unit_price,status,commission_rate,product_title,variant_description)
  VALUES(o.id,p.id,variant.id,v.id,qty,cents/100.0,'pending',v.commission_rate,p.title,variant.name||': '||variant.value);
 END LOOP;
 IF subtotal_cents>99999999 THEN RAISE EXCEPTION 'Order is too large'; END IF;
 UPDATE orders SET subtotal=subtotal_cents/100.0,total=subtotal_cents/100.0 WHERE id=o.id RETURNING * INTO o;
 RETURN jsonb_build_object('order',to_jsonb(o),'items',(SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.id) FROM order_items oi WHERE order_id=o.id));
END $$;
REVOKE ALL ON FUNCTION reserve_checkout(uuid,uuid,jsonb,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reserve_checkout(uuid,uuid,jsonb,text,boolean) TO service_role;

CREATE FUNCTION complete_checkout(event_arg text,order_arg uuid,session_arg text,payment_arg text,charge_arg text,
 subtotal_arg bigint,total_arg bigint,tax_arg bigint,currency_arg text,address_arg jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders; line record; net numeric; allocated bigint:=0; item_tax bigint; remaining integer;
BEGIN
 SELECT * INTO o FROM orders WHERE id=order_arg FOR UPDATE;
 IF NOT FOUND OR o.checkout_session_id IS DISTINCT FROM session_arg THEN RAISE EXCEPTION 'Checkout session not linked yet; retry'; END IF;
 IF o.payment_processed_at IS NOT NULL THEN RETURN; END IF;
 IF o.reservation_state IS DISTINCT FROM 'reserved' THEN RAISE EXCEPTION 'Reservation is not active'; END IF;
 IF currency_arg IS DISTINCT FROM 'usd' OR subtotal_arg IS DISTINCT FROM round(o.subtotal*100)::bigint OR tax_arg IS NULL OR tax_arg<0 OR total_arg IS DISTINCT FROM subtotal_arg+tax_arg OR payment_arg IS NULL THEN RAISE EXCEPTION 'Payment total mismatch'; END IF;
 IF length(coalesce(address_arg->>'line1',''))=0 OR length(coalesce(address_arg->>'postal_code',''))=0 OR address_arg->>'country' IS DISTINCT FROM 'US' THEN RAISE EXCEPTION 'Missing supported shipping address'; END IF;
 SELECT count(*) INTO remaining FROM order_items WHERE order_id=o.id;
 IF remaining=0 THEN RAISE EXCEPTION 'Order items missing'; END IF;
 FOR line IN SELECT * FROM order_items WHERE order_id=o.id ORDER BY id LOOP
  item_tax:=CASE WHEN remaining=1 THEN tax_arg-allocated ELSE floor(tax_arg*(line.unit_price*100*line.quantity)/subtotal_arg)::bigint END;
  UPDATE order_items SET tax_cents=item_tax,status='processing' WHERE id=line.id;
  allocated:=allocated+item_tax; remaining:=remaining-1;
 END LOOP;
 FOR line IN SELECT product_id,sum(quantity)::int qty FROM order_items WHERE order_id=o.id GROUP BY product_id ORDER BY product_id LOOP
  UPDATE products SET sold_count=sold_count+line.qty WHERE id=line.product_id;
 END LOOP;
 FOR line IN SELECT vendor_id,sum(quantity)::int qty,round(sum(quantity*unit_price*(1-commission_rate)),2) net FROM order_items WHERE order_id=o.id GROUP BY vendor_id ORDER BY vendor_id LOOP
  UPDATE vendors SET total_sales=total_sales+line.qty,total_revenue=total_revenue+line.net WHERE id=line.vendor_id;
  INSERT INTO payouts(vendor_id,order_id,amount,status,period_start,period_end) VALUES(line.vendor_id,o.id,line.net,'pending',now(),now());
  INSERT INTO notification_outbox(dedupe_key,kind,order_id,vendor_id) VALUES('paid:'||o.id||':'||line.vendor_id,'vendor_order',o.id,line.vendor_id) ON CONFLICT DO NOTHING;
 END LOOP;
 UPDATE orders SET reservation_state='paid',status='processing',payment_processed_at=now(),stripe_payment_id=payment_arg,payment_charge_id=charge_arg,
  tax=tax_arg/100.0,total=total_arg/100.0,shipping_name=address_arg->>'name',shipping_line1=address_arg->>'line1',shipping_line2=address_arg->>'line2',
  shipping_city=address_arg->>'city',shipping_state=address_arg->>'state',shipping_postal_code=address_arg->>'postal_code',shipping_country=address_arg->>'country' WHERE id=o.id;
 INSERT INTO stripe_events(event_id,event_type,payment_id) VALUES(event_arg,'checkout.session.completed',payment_arg) ON CONFLICT DO NOTHING;
 INSERT INTO notification_outbox(dedupe_key,kind,order_id) VALUES('paid:'||o.id,'customer_order',o.id) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION complete_checkout(text,uuid,text,text,text,bigint,bigint,bigint,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION complete_checkout(text,uuid,text,text,text,bigint,bigint,bigint,text,jsonb) TO service_role;

CREATE FUNCTION release_checkout(order_arg uuid,session_arg text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders; line record;
BEGIN
 SELECT * INTO o FROM orders WHERE id=order_arg FOR UPDATE;
 IF NOT FOUND OR o.checkout_session_id IS DISTINCT FROM session_arg THEN RAISE EXCEPTION 'Session mismatch'; END IF;
 IF o.reservation_state<>'reserved' THEN RETURN; END IF;
 FOR line IN SELECT product_id,sum(quantity)::int qty FROM order_items WHERE order_id=o.id GROUP BY product_id ORDER BY product_id LOOP
  UPDATE products SET inventory_count=inventory_count+line.qty WHERE id=line.product_id;
 END LOOP;
 FOR line IN SELECT variant_id,sum(quantity)::int qty FROM order_items WHERE order_id=o.id AND variant_id IS NOT NULL GROUP BY variant_id ORDER BY variant_id LOOP
  UPDATE product_variants SET inventory_count=inventory_count+line.qty WHERE id=line.variant_id;
 END LOOP;
 UPDATE order_items SET status='cancelled' WHERE order_id=o.id;
 UPDATE orders SET reservation_state='released',status='cancelled' WHERE id=o.id;
END $$;
REVOKE ALL ON FUNCTION release_checkout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION release_checkout(uuid,text) TO service_role;
COMMIT;
