BEGIN;
-- Only disclose identities used by visible reviews or an authorized private workflow.
CREATE OR REPLACE VIEW public_profiles WITH (security_barrier=true) AS
 SELECT p.id,p.full_name,p.avatar_url FROM profiles p WHERE
 p.id=auth.uid() OR get_user_role()='admin'
 OR EXISTS(SELECT 1 FROM reviews r JOIN products pr ON pr.id=r.product_id
   JOIN vendors v ON v.id=pr.vendor_id WHERE r.customer_id=p.id AND pr.status='approved' AND v.status='approved')
 OR EXISTS(SELECT 1 FROM return_requests r JOIN vendors v ON v.id=r.vendor_id
   WHERE r.customer_id=p.id AND v.user_id=auth.uid());
CREATE OR REPLACE FUNCTION confirm_vendor_terms(vendor_arg uuid,percentage_arg numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR get_user_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 IF percentage_arg IS NULL OR percentage_arg::text='NaN' OR percentage_arg<0 OR percentage_arg>=100 OR percentage_arg<>round(percentage_arg,2) THEN RAISE EXCEPTION 'Commission must be between 0 and 99.99 percent, with at most two decimal places'; END IF;
 UPDATE vendors SET commission_rate=percentage_arg/100,commercial_terms_confirmed=true WHERE id=vendor_arg AND status='approved';
 IF NOT FOUND THEN RAISE EXCEPTION 'Approved brand not found'; END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
