BEGIN;
CREATE FUNCTION save_launch_configuration(config_arg jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE mode text:=config_arg->>'checkout_mode';days integer;
BEGIN
 IF auth.uid() IS NULL OR get_user_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 days:=(config_arg->>'return_window_days')::integer;
 IF mode IS NULL OR mode NOT IN ('disabled','test','live') OR days IS NULL OR days NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'Choose a checkout mode and a return window from 1 to 365 days'; END IF;
 IF coalesce((config_arg->>'policies_confirmed')::boolean,false) AND (length(btrim(coalesce(config_arg->>'company_name','')))<2 OR coalesce(config_arg->>'support_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR length(btrim(coalesce(config_arg->>'return_condition','')))<20) THEN RAISE EXCEPTION 'Company, support email and return conditions are required before confirmation'; END IF;
 IF mode='live' AND NOT coalesce((config_arg->>'policies_confirmed')::boolean,false) THEN RAISE EXCEPTION 'Confirm policies before enabling live checkout'; END IF;
 INSERT INTO site_settings(key,value,updated_by) VALUES('launch_config',jsonb_build_object('checkout_mode',mode,'shipping_model','included','payout_mode','manual_after_delivery','return_window_days',days,'company_name',left(btrim(config_arg->>'company_name'),200),'support_email',left(btrim(config_arg->>'support_email'),254),'return_condition',left(btrim(config_arg->>'return_condition'),5000),'policies_confirmed',coalesce((config_arg->>'policies_confirmed')::boolean,false)),auth.uid()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now(),updated_by=auth.uid();
 UPDATE site_settings SET value=jsonb_build_object('enabled',coalesce((config_arg->>'policies_confirmed')::boolean,false),'window_days',days,'condition',config_arg->>'return_condition','process','Request a return from your order history. Wait for approval and shipping instructions before returning items.'),updated_at=now(),updated_by=auth.uid() WHERE key='return_policy';
END $$;
CREATE FUNCTION confirm_vendor_terms(vendor_arg uuid,percentage_arg numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR get_user_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 IF percentage_arg IS NULL OR percentage_arg::text='NaN' OR percentage_arg<0 OR percentage_arg>=100 THEN RAISE EXCEPTION 'Commission must be between 0 and less than 100 percent'; END IF;
 UPDATE vendors SET commission_rate=percentage_arg/100,commercial_terms_confirmed=true WHERE id=vendor_arg AND status='approved';
 IF NOT FOUND THEN RAISE EXCEPTION 'Approved brand not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION save_launch_configuration(jsonb),confirm_vendor_terms(uuid,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_launch_configuration(jsonb),confirm_vendor_terms(uuid,numeric) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
