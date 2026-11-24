BEGIN;
CREATE FUNCTION queue_financial_confirmation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE brand uuid;
BEGIN
 IF NEW.status='succeeded' AND OLD.status IS DISTINCT FROM NEW.status THEN
  SELECT vendor_id INTO brand FROM payouts WHERE id=NEW.payout_id;
  INSERT INTO notification_outbox(dedupe_key,kind,order_id,vendor_id,payload)
  VALUES('financial-confirmed:'||NEW.id,
    CASE WHEN NEW.kind='refund' THEN 'return_refunded' ELSE 'vendor_transfer' END,
    NEW.order_id,brand,jsonb_build_object('operation_id',NEW.id))
  ON CONFLICT(dedupe_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION queue_financial_confirmation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER financial_confirmation_notification AFTER UPDATE OF status ON financial_operations
 FOR EACH ROW EXECUTE FUNCTION queue_financial_confirmation();
COMMIT;
