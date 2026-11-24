BEGIN;
ALTER TABLE notification_outbox ADD COLUMN email_snapshot jsonb;
ALTER TABLE notification_outbox ADD COLUMN first_attempt_at timestamptz;
ALTER TABLE notification_outbox ADD COLUMN provider_message_id text;
CREATE OR REPLACE FUNCTION claim_notifications(batch_size integer DEFAULT 5) RETURNS SETOF notification_outbox
 LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE notification_outbox SET status='sending',locked_at=now(),first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1
 WHERE id IN (SELECT id FROM notification_outbox WHERE
 ((status IN ('pending','failed') AND next_attempt_at<=now()) OR (status='sending' AND locked_at<now()-interval '5 minutes'))
 AND attempts<10 AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours')
 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(batch_size,1),20)) RETURNING *;
$$;
REVOKE ALL ON FUNCTION claim_notifications(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_notifications(integer) TO service_role;
COMMIT;
