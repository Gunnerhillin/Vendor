BEGIN;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Private profiles" ON profiles FOR SELECT USING(id=auth.uid() OR get_user_role()='admin');
CREATE VIEW public_profiles WITH (security_barrier=true) AS SELECT id,full_name,avatar_url FROM profiles;
GRANT SELECT ON public_profiles TO anon,authenticated;
DROP POLICY IF EXISTS "Approved vendors are public" ON vendors;
CREATE POLICY "Private vendor accounts" ON vendors FOR SELECT USING(user_id=auth.uid() OR get_user_role()='admin');
CREATE VIEW vendor_directory WITH (security_barrier=true) AS
 SELECT id,business_name,slug,description,logo_url,banner_url,status,product_count,
 city,state,is_local,offers_local_pickup,offers_free_shipping,free_shipping_minimum,
 shipping_policy,processing_time,return_policy,is_featured FROM vendors WHERE status='approved';
GRANT SELECT ON vendor_directory TO anon,authenticated;
DROP POLICY "Approved products are public" ON products;
CREATE POLICY "Approved products are public" ON products FOR SELECT USING (
 (status='approved' AND EXISTS(SELECT 1 FROM vendor_directory WHERE id=vendor_id))
 OR vendor_id IN (SELECT id FROM vendors WHERE user_id=auth.uid()) OR get_user_role()='admin');
-- Previously public bearer tokens are retired. First launch uses authenticated manual tracking.
UPDATE vendors SET shipping_webhook_token=NULL;
ALTER TABLE vendors ADD COLUMN commercial_terms_confirmed boolean NOT NULL DEFAULT false;
CREATE FUNCTION guard_vendor_commercial_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND get_user_role() IS DISTINCT FROM 'admin' THEN
  IF TG_OP='INSERT' THEN NEW.commercial_terms_confirmed:=false; NEW.commission_rate:=0.25; NEW.total_revenue:=0; NEW.total_sales:=0;
  ELSIF ROW(NEW.commercial_terms_confirmed,NEW.total_revenue,NEW.total_sales) IS DISTINCT FROM ROW(OLD.commercial_terms_confirmed,OLD.total_revenue,OLD.total_sales) THEN
   RAISE EXCEPTION 'Commercial terms and earnings are managed by the platform' USING ERRCODE='42501';
  END IF;
  IF NEW.shipping_webhook_token IS NOT NULL THEN RAISE EXCEPTION 'Legacy shipping tokens are retired'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_vendor_commercial_fields BEFORE INSERT OR UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION guard_vendor_commercial_fields();

INSERT INTO site_settings(key,value) VALUES('launch_config',
 '{"checkout_mode":"disabled","shipping_model":"included","payout_mode":"manual_after_delivery","return_window_days":30,"policies_confirmed":false,"support_email":"","company_name":""}') ON CONFLICT DO NOTHING;

CREATE TABLE notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dedupe_key text UNIQUE NOT NULL, kind text NOT NULL,
 order_id uuid REFERENCES orders(id), vendor_id uuid REFERENCES vendors(id), payload jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 locked_at timestamptz, sent_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin notification audit" ON notification_outbox FOR SELECT USING(get_user_role()='admin');
CREATE FUNCTION claim_notifications(batch_size integer DEFAULT 20) RETURNS SETOF notification_outbox
 LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE notification_outbox SET status='sending',locked_at=now(),attempts=attempts+1
 WHERE id IN (SELECT id FROM notification_outbox WHERE
 ((status IN ('pending','failed') AND next_attempt_at<=now()) OR (status='sending' AND locked_at<now()-interval '5 minutes'))
 AND attempts<10 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(batch_size,1),50)) RETURNING *;
$$;
REVOKE ALL ON FUNCTION claim_notifications(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_notifications(integer) TO service_role;

ALTER TABLE order_items ADD COLUMN product_title text;
ALTER TABLE order_items ADD COLUMN variant_description text;
ALTER TABLE order_items ADD COLUMN delivery_confirmed_at timestamptz;
ALTER TABLE order_items ADD COLUMN delivery_confirmed_by uuid REFERENCES profiles(id);
ALTER TABLE order_items ADD COLUMN refunded_cents bigint NOT NULL DEFAULT 0 CHECK(refunded_cents>=0);
ALTER TABLE order_items ADD COLUMN returned_quantity integer NOT NULL DEFAULT 0;
UPDATE order_items oi SET product_title=p.title FROM products p WHERE p.id=oi.product_id;
CREATE TABLE fulfillment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_item_id uuid NOT NULL REFERENCES order_items(id),
 actor_id uuid NOT NULL REFERENCES profiles(id),status text NOT NULL,tracking_number text,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE fulfillment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin fulfillment audit" ON fulfillment_events FOR SELECT USING(get_user_role()='admin');
-- Writes go through locked, validated functions rather than arbitrary browser updates.
DROP POLICY IF EXISTS "Vendors can update own order items" ON order_items;
CREATE FUNCTION vendor_fulfillment_orders() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(oi)||jsonb_build_object('order',jsonb_build_object(
   'id',o.id,'created_at',o.created_at,'status',o.status,'shipping_name',o.shipping_name,
   'shipping_line1',o.shipping_line1,'shipping_line2',o.shipping_line2,'shipping_city',o.shipping_city,
   'shipping_state',o.shipping_state,'shipping_postal_code',o.shipping_postal_code,'shipping_country',o.shipping_country)) ORDER BY oi.created_at DESC)
 FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN vendors v ON v.id=oi.vendor_id
 WHERE v.user_id=auth.uid() AND o.payment_processed_at IS NOT NULL),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION vendor_fulfillment_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vendor_fulfillment_orders() TO authenticated;

CREATE FUNCTION update_fulfillment(item_id uuid,next_status text,tracking text DEFAULT NULL,carrier text DEFAULT NULL)
 RETURNS order_items LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i order_items; o orders; is_admin boolean:=get_user_role()='admin';
BEGIN
 SELECT * INTO i FROM order_items WHERE id=item_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
 SELECT * INTO o FROM orders WHERE id=i.order_id FOR UPDATE;
 SELECT * INTO i FROM order_items WHERE id=item_id FOR UPDATE;
 IF auth.uid() IS NULL OR (NOT coalesce(is_admin,false) AND NOT EXISTS(SELECT 1 FROM vendors WHERE id=i.vendor_id AND user_id=auth.uid() AND status='approved')) THEN
  RAISE EXCEPTION 'Not permitted' USING ERRCODE='42501'; END IF;
 IF o.payment_processed_at IS NULL OR o.status IN ('cancelled','refunded') OR i.status IN ('cancelled','refunded') THEN RAISE EXCEPTION 'Only paid active items can be fulfilled'; END IF;
 IF next_status='shipped' THEN
  IF i.status NOT IN ('processing','shipped') THEN RAISE EXCEPTION 'Invalid shipment transition'; END IF;
  IF length(btrim(coalesce(tracking,''))) NOT BETWEEN 4 AND 120 OR carrier IS NULL OR carrier NOT IN ('usps','ups','fedex','dhl','other') THEN RAISE EXCEPTION 'Carrier and tracking are required'; END IF;
  UPDATE order_items SET status='shipped',tracking_number=btrim(tracking),shipping_carrier=carrier,shipped_at=coalesce(shipped_at,now()) WHERE id=item_id RETURNING * INTO i;
 ELSIF next_status='delivered' THEN
  IF i.status NOT IN ('shipped','delivered') THEN RAISE EXCEPTION 'Ship the item before recording delivery'; END IF;
  UPDATE order_items SET status='delivered',delivered_at=coalesce(delivered_at,now()),
   delivery_confirmed_at=CASE WHEN is_admin THEN coalesce(delivery_confirmed_at,now()) ELSE delivery_confirmed_at END,
   delivery_confirmed_by=CASE WHEN is_admin THEN auth.uid() ELSE delivery_confirmed_by END WHERE id=item_id RETURNING * INTO i;
 ELSE RAISE EXCEPTION 'Invalid fulfillment status'; END IF;
 UPDATE orders SET status=CASE
  WHEN NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=o.id AND status NOT IN ('delivered','refunded','cancelled')) THEN 'delivered'
  WHEN NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=o.id AND status NOT IN ('shipped','delivered','refunded','cancelled')) THEN 'shipped'
  ELSE 'processing' END WHERE id=o.id;
 INSERT INTO fulfillment_events(order_item_id,actor_id,status,tracking_number) VALUES(item_id,auth.uid(),next_status,i.tracking_number);
 INSERT INTO notification_outbox(dedupe_key,kind,order_id,vendor_id,payload)
 VALUES('fulfillment:'||item_id||':'||next_status||':'||coalesce(i.tracking_number,''),'fulfillment',o.id,i.vendor_id,jsonb_build_object('item_id',item_id,'status',next_status)) ON CONFLICT DO NOTHING;
 RETURN i;
END $$;
REVOKE ALL ON FUNCTION update_fulfillment(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_fulfillment(uuid,text,text,text) TO authenticated;
GRANT SELECT ON notification_outbox,fulfillment_events TO authenticated;
GRANT ALL ON notification_outbox,fulfillment_events TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
