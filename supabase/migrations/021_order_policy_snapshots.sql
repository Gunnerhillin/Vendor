BEGIN;
ALTER TABLE orders ADD COLUMN policy_snapshot jsonb;
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
 INSERT INTO orders(customer_id,status,subtotal,tax,shipping,total,checkout_key,checkout_cart,reservation_state,reservation_expires_at,checkout_email,checkout_livemode,policy_snapshot)
 VALUES(customer_arg,'pending',0,0,0,0,key_arg,cart_arg,'reserved',now()+interval '35 minutes',email_arg,live_arg,config) RETURNING * INTO o;
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

CREATE OR REPLACE FUNCTION request_return(item_arg uuid,reason_arg text,description_arg text DEFAULT NULL)
RETURNS return_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i order_items; o orders; r return_requests; config jsonb; window_days integer;
BEGIN
 SELECT * INTO i FROM order_items WHERE id=item_arg;
 SELECT * INTO o FROM orders WHERE id=i.order_id FOR UPDATE;
 SELECT * INTO i FROM order_items WHERE id=item_arg FOR UPDATE;
 IF auth.uid() IS NULL OR o.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Order item not found' USING ERRCODE='42501'; END IF;
 IF o.payment_processed_at IS NULL OR i.status<>'delivered' OR i.delivered_at IS NULL THEN RAISE EXCEPTION 'Returns can be requested after delivery'; END IF;
 IF EXISTS(SELECT 1 FROM return_requests WHERE order_item_id=i.id) THEN RAISE EXCEPTION 'A return already exists for this item'; END IF;
 IF o.policy_snapshot IS NOT NULL THEN config:=o.policy_snapshot; ELSE SELECT value INTO config FROM site_settings WHERE key='launch_config'; END IF;
 window_days:=coalesce((config->>'return_window_days')::integer,0);
 IF window_days NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'Return policy needs configuration'; END IF;
 IF now()>i.delivered_at+make_interval(days=>window_days) THEN RAISE EXCEPTION 'The return request window has ended'; END IF;
 IF length(btrim(coalesce(reason_arg,''))) NOT BETWEEN 3 AND 200 OR length(coalesce(description_arg,''))>3000 THEN RAISE EXCEPTION 'Provide a return reason and a description of at most 3000 characters'; END IF;
 INSERT INTO return_requests(order_item_id,order_id,customer_id,vendor_id,reason,description)
 VALUES(i.id,o.id,auth.uid(),i.vendor_id,btrim(reason_arg),description_arg) RETURNING * INTO r;
 UPDATE order_items SET return_status='requested',return_reason=reason_arg,return_requested_at=now() WHERE id=i.id;
 INSERT INTO notification_outbox(dedupe_key,kind,order_id,vendor_id,payload) VALUES('return:'||r.id,'vendor_return',o.id,i.vendor_id,jsonb_build_object('return_id',r.id));
 RETURN r;
END $$;

COMMIT;
