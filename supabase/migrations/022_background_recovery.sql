BEGIN;
ALTER TABLE orders ADD COLUMN recovery_checked_at timestamptz;
CREATE INDEX orders_recovery_queue ON orders(recovery_checked_at NULLS FIRST,created_at) WHERE reservation_state='reserved';
-- A leased batch prevents overlapping workers from repeatedly choosing the same
-- old reservations. Unresolved reservations remain held for manual review.
CREATE FUNCTION claim_checkout_recovery(batch_size integer DEFAULT 3)
RETURNS TABLE(id uuid,checkout_session_id text,created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE orders SET recovery_checked_at=now()
 WHERE orders.id IN (
   SELECT o.id FROM orders o WHERE o.reservation_state='reserved'
   AND o.created_at<now()-interval '5 minutes'
   AND (o.recovery_checked_at IS NULL OR o.recovery_checked_at<now()-interval '30 minutes')
   ORDER BY o.recovery_checked_at NULLS FIRST,o.created_at
   FOR UPDATE SKIP LOCKED LIMIT least(greatest(batch_size,1),3)
 ) RETURNING orders.id,orders.checkout_session_id,orders.created_at;
$$;
REVOKE ALL ON FUNCTION claim_checkout_recovery(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_checkout_recovery(integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
