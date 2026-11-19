BEGIN;
DROP POLICY IF EXISTS "Customers can create returns" ON return_requests;
DROP POLICY IF EXISTS "Vendors can update returns" ON return_requests;
DROP POLICY IF EXISTS "Admins full access to returns" ON return_requests;
CREATE POLICY "Admins read returns" ON return_requests FOR SELECT USING(get_user_role()='admin');
ALTER TABLE return_requests ADD COLUMN received_at timestamptz;
ALTER TABLE return_requests ADD COLUMN received_by uuid REFERENCES profiles(id);
ALTER TABLE return_requests ADD COLUMN receipt_notes text;
CREATE FUNCTION request_return(item_arg uuid,reason_arg text,description_arg text DEFAULT NULL)
RETURNS return_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i order_items; o orders; r return_requests; config jsonb; window_days integer;
BEGIN
 SELECT * INTO i FROM order_items WHERE id=item_arg;
 SELECT * INTO o FROM orders WHERE id=i.order_id FOR UPDATE;
 SELECT * INTO i FROM order_items WHERE id=item_arg FOR UPDATE;
 IF auth.uid() IS NULL OR o.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Order item not found' USING ERRCODE='42501'; END IF;
 IF o.payment_processed_at IS NULL OR i.status<>'delivered' OR i.delivered_at IS NULL THEN RAISE EXCEPTION 'Returns can be requested after delivery'; END IF;
 IF EXISTS(SELECT 1 FROM return_requests WHERE order_item_id=i.id) THEN RAISE EXCEPTION 'A return already exists for this item'; END IF;
 SELECT value INTO config FROM site_settings WHERE key='launch_config';
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
CREATE FUNCTION decide_return(return_arg uuid,status_arg text,notes_arg text DEFAULT NULL)
RETURNS return_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r return_requests; admin_actor boolean:=coalesce(get_user_role()='admin',false);
BEGIN
 SELECT * INTO r FROM return_requests WHERE id=return_arg;
 PERFORM 1 FROM orders WHERE id=r.order_id FOR UPDATE;
 SELECT * INTO r FROM return_requests WHERE id=return_arg FOR UPDATE;
 IF r.id IS NULL OR auth.uid() IS NULL OR (NOT admin_actor AND NOT EXISTS(SELECT 1 FROM vendors WHERE id=r.vendor_id AND user_id=auth.uid() AND status='approved')) THEN RAISE EXCEPTION 'Not permitted' USING ERRCODE='42501'; END IF;
 IF status_arg NOT IN ('approved','denied') OR status_arg IS NULL THEN RAISE EXCEPTION 'Invalid return decision'; END IF;
 IF r.status='completed' OR r.received_at IS NOT NULL OR (NOT admin_actor AND r.status<>'requested') THEN RAISE EXCEPTION 'This return cannot be changed'; END IF;
 IF length(coalesce(notes_arg,''))>3000 OR (status_arg='denied' AND length(btrim(coalesce(notes_arg,'')))<3) THEN RAISE EXCEPTION 'A denial reason is required; notes must be at most 3000 characters'; END IF;
 UPDATE return_requests SET status=status_arg,resolution_notes=notes_arg,resolved_by=auth.uid(),admin_override=admin_actor,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 UPDATE order_items SET return_status=status_arg,return_notes=notes_arg,return_resolved_by=auth.uid(),return_resolved_at=now() WHERE id=r.order_item_id;
 INSERT INTO notification_outbox(dedupe_key,kind,order_id,vendor_id,payload) VALUES('return:'||r.id||':'||status_arg,'return_decision',r.order_id,r.vendor_id,jsonb_build_object('return_id',r.id,'status',status_arg)) ON CONFLICT DO NOTHING;
 RETURN r;
END $$;
CREATE FUNCTION receive_return(return_arg uuid,notes_arg text)
RETURNS return_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r return_requests;
BEGIN
 IF auth.uid() IS NULL OR get_user_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM return_requests WHERE id=return_arg;
 PERFORM 1 FROM orders WHERE id=r.order_id FOR UPDATE;
 SELECT * INTO r FROM return_requests WHERE id=return_arg FOR UPDATE;
 IF r.id IS NULL OR r.status<>'approved' THEN RAISE EXCEPTION 'Approve the return before recording receipt'; END IF;
 IF length(btrim(coalesce(notes_arg,''))) NOT BETWEEN 3 AND 3000 THEN RAISE EXCEPTION 'Record the receipt and condition of the returned items'; END IF;
 IF r.received_at IS NOT NULL THEN RETURN r; END IF;
 UPDATE return_requests SET received_at=now(),received_by=auth.uid(),receipt_notes=notes_arg WHERE id=r.id RETURNING * INTO r;
 -- Receipt is not a refund and does not automatically make used/damaged goods sellable.
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION request_return(uuid,text,text),decide_return(uuid,text,text),receive_return(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_return(uuid,text,text),decide_return(uuid,text,text),receive_return(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
