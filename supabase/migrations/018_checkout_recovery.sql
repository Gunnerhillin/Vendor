BEGIN;
CREATE FUNCTION link_checkout_session(order_arg uuid,session_arg text,subtotal_arg bigint,currency_arg text,live_arg boolean,url_arg text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders;
BEGIN
 SELECT * INTO o FROM orders WHERE id=order_arg FOR UPDATE;
 IF o.id IS NULL OR session_arg IS NULL OR currency_arg IS DISTINCT FROM 'usd' OR live_arg IS DISTINCT FROM o.checkout_livemode OR subtotal_arg IS DISTINCT FROM round(o.subtotal*100)::bigint THEN RAISE EXCEPTION 'Checkout session does not match reserved order'; END IF;
 IF o.checkout_session_id IS NOT NULL AND o.checkout_session_id<>session_arg THEN RAISE EXCEPTION 'Different checkout session already linked'; END IF;
 IF o.checkout_session_id=session_arg THEN RETURN; END IF;
 IF o.reservation_state IS DISTINCT FROM 'reserved' THEN RAISE EXCEPTION 'Reservation is not active'; END IF;
 UPDATE orders SET checkout_session_id=session_arg,checkout_url=url_arg WHERE id=o.id;
END $$;
REVOKE ALL ON FUNCTION link_checkout_session(uuid,text,bigint,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION link_checkout_session(uuid,text,bigint,text,boolean,text) TO service_role;
COMMIT;
