BEGIN;
ALTER TABLE public.orders ADD COLUMN payment_processed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN refunded_amount_cents bigint NOT NULL DEFAULT 0 CHECK(refunded_amount_cents>=0);
ALTER TABLE public.orders ADD COLUMN payment_failure_at timestamptz;
ALTER TABLE public.payouts ADD COLUMN order_id uuid REFERENCES public.orders(id);
ALTER TABLE public.payouts ADD COLUMN reconciliation_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN commission_rate numeric(5,4);
CREATE UNIQUE INDEX payouts_order_vendor_unique ON public.payouts(order_id,vendor_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX orders_stripe_payment_unique ON public.orders(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
UPDATE public.orders SET payment_processed_at=created_at WHERE status IN ('processing','shipped','delivered','refunded');

CREATE TABLE public.stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payment_id text,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payment event audit" ON public.stripe_events FOR SELECT USING(public.get_user_role()='admin');

-- Service-only entry point. The event marker and all bookkeeping commit together.
CREATE FUNCTION public.process_payment_event(event_id_arg text,event_type_arg text,payment_id_arg text,
 amount_cents_arg bigint DEFAULT NULL,refunded_cents_arg bigint DEFAULT NULL,currency_arg text DEFAULT 'usd')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; i record; v record; affected integer;
BEGIN
  IF event_type_arg NOT IN ('payment_intent.succeeded','payment_intent.payment_failed','charge.refunded') THEN
    RAISE EXCEPTION 'Unsupported payment event';
  END IF;
  INSERT INTO public.stripe_events(event_id,event_type,payment_id) VALUES(event_id_arg,event_type_arg,payment_id_arg)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected=0 THEN RETURN jsonb_build_object('duplicate',true); END IF;
  SELECT * INTO o FROM public.orders WHERE stripe_payment_id=payment_id_arg FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found; retry event after checkout commits'; END IF;
  IF event_type_arg='payment_intent.succeeded' THEN
    IF o.payment_processed_at IS NOT NULL THEN RETURN jsonb_build_object('duplicate',true,'order_id',o.id); END IF;
    IF currency_arg IS DISTINCT FROM 'usd' OR amount_cents_arg IS DISTINCT FROM round(o.total*100)::bigint THEN
      RAISE EXCEPTION 'Payment does not match order total';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id=o.id) THEN RAISE EXCEPTION 'Order items missing'; END IF;
    -- Stable lock order and arithmetic updates prevent lost inventory changes.
    FOR i IN SELECT product_id,sum(quantity)::integer qty FROM public.order_items WHERE order_id=o.id GROUP BY product_id ORDER BY product_id LOOP
      IF i.qty<=0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
      UPDATE public.products SET inventory_count=inventory_count-i.qty,sold_count=sold_count+i.qty
      WHERE id=i.product_id AND inventory_count>=i.qty;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock; payment needs review'; END IF;
    END LOOP;
    FOR i IN SELECT variant_id,product_id,sum(quantity)::integer qty FROM public.order_items
      WHERE order_id=o.id AND variant_id IS NOT NULL GROUP BY variant_id,product_id ORDER BY variant_id LOOP
      UPDATE public.product_variants SET inventory_count=inventory_count-i.qty
      WHERE id=i.variant_id AND product_id=i.product_id AND inventory_count>=i.qty;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient variant stock; payment needs review'; END IF;
    END LOOP;
    UPDATE public.order_items oi SET commission_rate=brand.commission_rate FROM public.vendors brand
      WHERE oi.order_id=o.id AND brand.id=oi.vendor_id AND oi.commission_rate IS NULL;
    FOR v IN SELECT vendor_id,sum(quantity)::integer qty,round(sum(quantity*unit_price*(1-commission_rate)),2) net
      FROM public.order_items WHERE order_id=o.id GROUP BY vendor_id ORDER BY vendor_id LOOP
      IF v.net IS NULL OR v.net<0 THEN RAISE EXCEPTION 'Invalid vendor earnings'; END IF;
      UPDATE public.vendors SET total_sales=total_sales+v.qty,total_revenue=total_revenue+v.net WHERE id=v.vendor_id;
      INSERT INTO public.payouts(vendor_id,order_id,amount,status,period_start,period_end)
        VALUES(v.vendor_id,o.id,v.net,'pending',now(),now());
    END LOOP;
    UPDATE public.orders SET payment_processed_at=now(),payment_failure_at=NULL,status='processing' WHERE id=o.id;
    UPDATE public.order_items SET status='processing' WHERE order_id=o.id;
  ELSIF event_type_arg='payment_intent.payment_failed' THEN
    -- A failed attempt is retryable; it must not undo a later successful payment.
    IF o.payment_processed_at IS NULL THEN
      UPDATE public.orders SET payment_failure_at=now() WHERE id=o.id;
    END IF;
  ELSE
    IF o.payment_processed_at IS NULL THEN RAISE EXCEPTION 'Payment success not processed yet; retry refund'; END IF;
    IF currency_arg IS DISTINCT FROM 'usd' OR amount_cents_arg IS DISTINCT FROM round(o.total*100)::bigint
       OR refunded_cents_arg IS NULL OR refunded_cents_arg<0 OR refunded_cents_arg>amount_cents_arg THEN
      RAISE EXCEPTION 'Invalid refund amount';
    END IF;
    IF refunded_cents_arg>o.refunded_amount_cents THEN
      UPDATE public.orders SET refunded_amount_cents=refunded_cents_arg,
        status=CASE WHEN refunded_cents_arg=amount_cents_arg THEN 'refunded' ELSE status END WHERE id=o.id;
      -- A charge-level refund does not identify returned SKUs, tax allocation or
      -- transfer reversals. Hold payouts for reconciliation instead of inventing it.
      UPDATE public.payouts SET reconciliation_required=true WHERE order_id=o.id;
      IF refunded_cents_arg=amount_cents_arg THEN
        UPDATE public.order_items SET status='refunded' WHERE order_id=o.id;
      END IF;
    END IF;
    -- Never restock on a financial event. Physical receipt is a separate action.
  END IF;
  RETURN jsonb_build_object('duplicate',false,'order_id',o.id);
END $$;
REVOKE ALL ON FUNCTION public.process_payment_event(text,text,text,bigint,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment_event(text,text,text,bigint,bigint,text) TO service_role;

-- Protect server-managed accounting columns against direct browser writes.
CREATE FUNCTION public.guard_payment_accounting() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF auth.role() IN ('authenticated','anon') THEN
    IF TG_TABLE_NAME='orders' THEN
      IF (TG_OP='INSERT' AND (NEW.payment_processed_at IS NOT NULL OR NEW.refunded_amount_cents<>0)) OR
         (TG_OP='UPDATE' AND (NEW.payment_processed_at IS DISTINCT FROM OLD.payment_processed_at OR NEW.refunded_amount_cents IS DISTINCT FROM OLD.refunded_amount_cents)) THEN
        RAISE EXCEPTION 'Payment accounting is server-managed' USING ERRCODE='42501';
      END IF;
    ELSIF TG_TABLE_NAME='payouts' AND TG_OP='UPDATE' THEN
      IF OLD.reconciliation_required AND (NEW.status IS DISTINCT FROM OLD.status OR NOT NEW.reconciliation_required) THEN
        RAISE EXCEPTION 'Refund reconciliation required before payout' USING ERRCODE='42501';
      END IF;
    ELSIF TG_TABLE_NAME='return_requests' THEN
      IF NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
        RAISE EXCEPTION 'Confirm a real refund before completing this return' USING ERRCODE='42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_payment_accounting BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_payment_accounting();
CREATE TRIGGER guard_payout_reconciliation BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.guard_payment_accounting();
CREATE TRIGGER guard_return_completion BEFORE INSERT OR UPDATE ON public.return_requests FOR EACH ROW EXECUTE FUNCTION public.guard_payment_accounting();

CREATE FUNCTION public.guard_vendor_payment_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF auth.role() IN ('authenticated','anon') AND (
    (TG_OP='INSERT' AND (NEW.stripe_account_id IS NOT NULL OR NEW.stripe_onboarding_complete)) OR
    (TG_OP='UPDATE' AND (NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id OR
      NEW.stripe_onboarding_complete IS DISTINCT FROM OLD.stripe_onboarding_complete))) THEN
    RAISE EXCEPTION 'Stripe connection is server-managed' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_vendor_payment_fields BEFORE INSERT OR UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_payment_fields();

-- Checkout creates priced orders after server-side cart validation.
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
DROP POLICY IF EXISTS "System can create order items" ON public.order_items;
CREATE FUNCTION public.guard_order_item_accounting() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role() IN ('authenticated','anon') AND (
   ROW(NEW.order_id,NEW.product_id,NEW.variant_id,NEW.vendor_id,NEW.quantity,NEW.unit_price,NEW.commission_rate)
   IS DISTINCT FROM ROW(OLD.order_id,OLD.product_id,OLD.variant_id,OLD.vendor_id,OLD.quantity,OLD.unit_price,OLD.commission_rate)
   OR (NEW.status='refunded' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
   RAISE EXCEPTION 'Order accounting is server-managed' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_order_item_accounting BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.guard_order_item_accounting();
COMMIT;
