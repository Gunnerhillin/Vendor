BEGIN;
ALTER TABLE payouts ADD COLUMN stripe_transfer_id text UNIQUE;
ALTER TABLE payouts ADD COLUMN reversed_cents bigint NOT NULL DEFAULT 0 CHECK(reversed_cents>=0);
DROP POLICY IF EXISTS "Admins can manage payouts" ON payouts;
CREATE TABLE financial_operations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL CHECK(kind IN ('refund','transfer')),
 order_id uuid NOT NULL REFERENCES orders(id),payout_id uuid NOT NULL REFERENCES payouts(id),
 return_id uuid UNIQUE REFERENCES return_requests(id),actor_id uuid NOT NULL REFERENCES profiles(id),
 amount_cents bigint NOT NULL CHECK(amount_cents>0),vendor_cents bigint NOT NULL CHECK(vendor_cents>=0),
 charge_id text NOT NULL,destination text,transfer_id text,reversal_id text,provider_id text UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','succeeded')),
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,last_error text);
CREATE UNIQUE INDEX one_transfer_per_payout ON financial_operations(payout_id) WHERE kind='transfer';
ALTER TABLE financial_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin financial audit" ON financial_operations FOR SELECT USING(get_user_role()='admin');
GRANT SELECT ON financial_operations TO authenticated;
GRANT ALL ON financial_operations TO service_role;
CREATE FUNCTION prepare_financial_operation(kind_arg text,target_arg uuid) RETURNS financial_operations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders;p payouts;r return_requests;i order_items;v vendors;f financial_operations;remaining_cents bigint;amount bigint;net bigint;
BEGIN
 IF auth.uid() IS NULL OR get_user_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 IF kind_arg='transfer' THEN SELECT * INTO p FROM payouts WHERE id=target_arg;
 ELSIF kind_arg='refund' THEN SELECT * INTO r FROM return_requests WHERE id=target_arg;SELECT * INTO p FROM payouts WHERE order_id=r.order_id AND vendor_id=r.vendor_id;
 ELSE RAISE EXCEPTION 'Invalid operation'; END IF;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Order payout record not found'; END IF;
 SELECT * INTO o FROM orders WHERE id=p.order_id FOR UPDATE;
 SELECT * INTO p FROM payouts WHERE id=p.id FOR UPDATE;
 SELECT * INTO f FROM financial_operations WHERE (kind_arg='transfer' AND kind='transfer' AND payout_id=p.id) OR (kind_arg='refund' AND return_id=r.id);
 IF FOUND THEN RETURN f; END IF;
 IF o.payment_processed_at IS NULL OR o.payment_charge_id IS NULL OR o.reservation_state IS DISTINCT FROM 'paid' THEN RAISE EXCEPTION 'Verified hosted checkout payment required'; END IF;
 IF EXISTS(SELECT 1 FROM financial_operations WHERE order_id=o.id AND status='pending') THEN RAISE EXCEPTION 'Resolve the pending financial operation for this order first'; END IF;
 IF p.reconciliation_required OR o.refunded_amount_cents<>(SELECT coalesce(sum(refunded_cents),0) FROM order_items WHERE order_id=o.id) THEN RAISE EXCEPTION 'Refund reconciliation required'; END IF;
 SELECT * INTO v FROM vendors WHERE id=p.vendor_id;
 IF kind_arg='transfer' THEN
  IF p.status<>'pending' OR p.stripe_transfer_id IS NOT NULL OR NOT v.stripe_onboarding_complete OR v.status<>'approved' OR NOT v.commercial_terms_confirmed THEN RAISE EXCEPTION 'Vendor terms and payment readiness must be confirmed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=o.id AND vendor_id=p.vendor_id) OR EXISTS(SELECT 1 FROM order_items WHERE order_id=o.id AND vendor_id=p.vendor_id AND status<>'refunded' AND (status<>'delivered' OR delivery_confirmed_at IS NULL)) THEN RAISE EXCEPTION 'Verify delivery of all brand items before transferring funds'; END IF;
  IF EXISTS(SELECT 1 FROM return_requests WHERE order_id=o.id AND vendor_id=p.vendor_id AND status IN ('requested','approved')) THEN RAISE EXCEPTION 'Resolve open returns before transferring funds'; END IF;
  amount:=round(p.amount*100)::bigint;net:=amount;
 ELSE
  SELECT * INTO r FROM return_requests WHERE id=r.id FOR UPDATE;
  SELECT * INTO i FROM order_items WHERE id=r.order_item_id FOR UPDATE;
  IF r.status<>'approved' OR r.received_at IS NULL OR i.refunded_cents<>0 THEN RAISE EXCEPTION 'An approved, received, unrefunded return is required'; END IF;
  amount:=round(i.unit_price*i.quantity*100)::bigint+i.tax_cents;
  SELECT round(coalesce(sum(unit_price*quantity*(1-commission_rate)),0)*100)::bigint INTO remaining_cents FROM order_items WHERE order_id=o.id AND vendor_id=p.vendor_id AND id<>i.id AND refunded_cents=0;
  net:=round(p.amount*100)::bigint-p.reversed_cents-remaining_cents;
  IF net<0 THEN RAISE EXCEPTION 'Vendor earnings need reconciliation'; END IF;
 END IF;
 IF amount<=0 THEN RAISE EXCEPTION 'No amount remains to transfer or refund'; END IF;
 INSERT INTO financial_operations(kind,order_id,payout_id,return_id,actor_id,amount_cents,vendor_cents,charge_id,destination,transfer_id)
 VALUES(kind_arg,o.id,p.id,r.id,auth.uid(),amount,net,o.payment_charge_id,v.stripe_account_id,p.stripe_transfer_id) RETURNING * INTO f;
 IF kind_arg='transfer' THEN UPDATE payouts SET status='processing' WHERE id=p.id; END IF;
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION prepare_financial_operation(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prepare_financial_operation(text,uuid) TO authenticated;
CREATE FUNCTION finish_financial_operation(operation_arg uuid,provider_arg text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f financial_operations;p payouts;r return_requests;i order_items;total_refund bigint;
BEGIN
 SELECT * INTO f FROM financial_operations WHERE id=operation_arg;
 PERFORM 1 FROM orders WHERE id=f.order_id FOR UPDATE;
 SELECT * INTO f FROM financial_operations WHERE id=operation_arg FOR UPDATE;
 IF f.id IS NULL OR provider_arg IS NULL THEN RAISE EXCEPTION 'Operation confirmation required'; END IF;
 IF f.status='succeeded' THEN IF f.provider_id IS DISTINCT FROM provider_arg THEN RAISE EXCEPTION 'Provider mismatch'; END IF;RETURN; END IF;
 SELECT * INTO p FROM payouts WHERE id=f.payout_id FOR UPDATE;
 IF f.kind='transfer' THEN
  UPDATE payouts SET status='paid',stripe_transfer_id=provider_arg,paid_at=now() WHERE id=p.id;
 ELSE
  IF f.transfer_id IS NOT NULL AND f.vendor_cents>0 AND f.reversal_id IS NULL THEN RAISE EXCEPTION 'Transfer reversal required'; END IF;
  SELECT * INTO r FROM return_requests WHERE id=f.return_id FOR UPDATE;
  SELECT * INTO i FROM order_items WHERE id=r.order_item_id FOR UPDATE;
  UPDATE order_items SET refunded_cents=f.amount_cents,refunded_quantity=quantity,return_status='completed',status='refunded' WHERE id=i.id;
  UPDATE return_requests SET status='completed',updated_at=now() WHERE id=r.id;
  UPDATE vendors SET total_revenue=greatest(0,total_revenue-f.vendor_cents/100.0) WHERE id=p.vendor_id;
  IF f.transfer_id IS NULL THEN UPDATE payouts SET amount=amount-f.vendor_cents/100.0 WHERE id=p.id;
  ELSE UPDATE payouts SET reversed_cents=reversed_cents+f.vendor_cents WHERE id=p.id; END IF;
  SELECT coalesce(sum(refunded_cents),0) INTO total_refund FROM order_items WHERE order_id=f.order_id;
  UPDATE orders SET refunded_amount_cents=greatest(refunded_amount_cents,total_refund),status=CASE WHEN total_refund=round(total*100)::bigint THEN 'refunded' ELSE status END WHERE id=f.order_id;
  -- External/unallocated refunds remain on hold; never automatically clear their reconciliation flag.
  INSERT INTO notification_outbox(dedupe_key,kind,order_id,vendor_id,payload) VALUES('refund:'||f.id,'return_decision',f.order_id,p.vendor_id,jsonb_build_object('status','refunded','return_id',r.id)) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE financial_operations SET status='succeeded',provider_id=provider_arg,completed_at=now(),last_error=NULL WHERE id=f.id;
END $$;
REVOKE ALL ON FUNCTION finish_financial_operation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION finish_financial_operation(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
