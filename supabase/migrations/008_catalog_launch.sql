BEGIN;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_featured_vendor() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF (TG_OP = 'INSERT' AND NEW.is_featured) OR
       (TG_OP = 'UPDATE' AND NEW.is_featured IS DISTINCT FROM OLD.is_featured) THEN
      RAISE EXCEPTION 'Only admins can feature brands' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_featured_vendor BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.guard_featured_vendor();

CREATE FUNCTION public.feature_vendor(target_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  LOCK TABLE public.vendors IN SHARE ROW EXCLUSIVE MODE;
  IF target_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vendors WHERE id=target_id AND status='approved') THEN
    RAISE EXCEPTION 'Choose an approved brand';
  END IF;
  UPDATE public.vendors SET is_featured=false WHERE is_featured;
  UPDATE public.vendors SET is_featured=true WHERE id=target_id;
END $$;
REVOKE ALL ON FUNCTION public.feature_vendor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feature_vendor(uuid) TO authenticated;

-- Keep existing buckets private. The media route checks listing visibility.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('vendor-assets','vendor-assets',false,5242880,ARRAY['image/jpeg','image/png','image/webp']),
       ('avatars','avatars',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET file_size_limit=5242880, allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY "Owners upload vendor images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='vendor-assets' AND (storage.foldername(name))[2]=auth.uid()::text
 AND (storage.foldername(name))[1] IN ('vendor-applications','products','vendor-logo','vendor-banner'));
CREATE POLICY "Owners read vendor images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='vendor-assets' AND ((storage.foldername(name))[2]=auth.uid()::text OR public.get_user_role()='admin'));
CREATE POLICY "Owners upload avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Owners read avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);

-- Existing records use generated public URLs although these buckets are private.
-- Generated filenames contain UUIDs, digits, hyphens, slashes and extensions only.
UPDATE public.product_images SET url='/api/media?bucket=vendor-assets&path=' || replace(split_part(url,'/storage/v1/object/public/vendor-assets/',2), '/', '%2F')
WHERE url LIKE '%/storage/v1/object/public/vendor-assets/%';
UPDATE public.vendors SET
 logo_url=CASE WHEN logo_url LIKE '%/storage/v1/object/public/vendor-assets/%' THEN '/api/media?bucket=vendor-assets&path=' || replace(split_part(logo_url,'/storage/v1/object/public/vendor-assets/',2),'/', '%2F') ELSE logo_url END,
 banner_url=CASE WHEN banner_url LIKE '%/storage/v1/object/public/vendor-assets/%' THEN '/api/media?bucket=vendor-assets&path=' || replace(split_part(banner_url,'/storage/v1/object/public/vendor-assets/',2),'/', '%2F') ELSE banner_url END,
 sample_images=ARRAY(SELECT CASE WHEN u LIKE '%/storage/v1/object/public/vendor-assets/%' THEN '/api/media?bucket=vendor-assets&path=' || replace(split_part(u,'/storage/v1/object/public/vendor-assets/',2),'/', '%2F') ELSE u END FROM unnest(sample_images) u);
COMMIT;
