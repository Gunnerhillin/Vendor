BEGIN;

-- Required by the application form, but absent from migrations 001-006.
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS sample_images text[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL
     AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change roles' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_profile_role BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE
USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');

CREATE OR REPLACE FUNCTION public.guard_vendor_moderation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'pending' OR NEW.approved_at IS NOT NULL THEN
        RAISE EXCEPTION 'Applications must await approval' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate THEN
      RAISE EXCEPTION 'Only administrators can moderate vendors' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_vendor_moderation BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_moderation();

-- Both changes commit together. No service-role credential is sent to the browser.
CREATE OR REPLACE FUNCTION public.moderate_vendor(vendor_id uuid, new_status text)
RETURNS public.vendors LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.vendors;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF new_status NOT IN ('approved', 'rejected', 'frozen') OR new_status IS NULL THEN
    RAISE EXCEPTION 'Invalid vendor status';
  END IF;
  UPDATE public.vendors SET status = new_status,
    approved_at = CASE WHEN new_status = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END
    WHERE id = vendor_id RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor not found'; END IF;
  IF new_status = 'approved' THEN
    UPDATE public.profiles SET role = 'vendor' WHERE id = result.user_id AND role <> 'admin';
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = result.user_id) THEN
      RAISE EXCEPTION 'Vendor profile not found';
    END IF;
  END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.moderate_vendor(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_vendor(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_product_moderation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = NEW.vendor_id
                   AND user_id = auth.uid() AND status = 'approved') THEN
      RAISE EXCEPTION 'An approved vendor is required' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('draft', 'pending') THEN
        RAISE EXCEPTION 'Products must await moderation' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
        RAISE EXCEPTION 'Cannot transfer product ownership' USING ERRCODE = '42501';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('draft', 'pending') THEN
        RAISE EXCEPTION 'Only administrators can approve products' USING ERRCODE = '42501';
      END IF;
      IF ROW(NEW.title, NEW.description, NEW.price, NEW.compare_at_price, NEW.category_id)
         IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD.price, OLD.compare_at_price, OLD.category_id) THEN
        NEW.status := 'pending';
      END IF;
    END IF;
  ELSIF NEW.status = 'approved' AND NOT EXISTS
    (SELECT 1 FROM public.vendors WHERE id = NEW.vendor_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Approve the vendor before approving its products';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_product_moderation BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_product_moderation();

-- Media and variants are part of the listing being reviewed too.
CREATE OR REPLACE FUNCTION public.review_product_details()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF TG_OP = 'UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      RAISE EXCEPTION 'Cannot transfer product details' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN target := OLD.product_id; ELSE target := NEW.product_id; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.products p JOIN public.vendors v ON v.id = p.vendor_id
                   WHERE p.id = target AND v.user_id = auth.uid() AND v.status = 'approved') THEN
      RAISE EXCEPTION 'An approved vendor is required' USING ERRCODE = '42501';
    END IF;
    UPDATE public.products SET status = 'pending' WHERE id = target AND status <> 'pending';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER review_product_images BEFORE INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.review_product_details();
CREATE TRIGGER review_product_variants BEFORE INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.review_product_details();

DROP POLICY "Approved products are public" ON public.products;
CREATE POLICY "Approved products are public" ON public.products FOR SELECT USING (
  (status = 'approved' AND EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND status = 'approved'))
  OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  OR public.get_user_role() = 'admin'
);

DROP POLICY "Product images follow product visibility" ON public.product_images;
CREATE POLICY "Product images follow product visibility" ON public.product_images FOR SELECT
USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_id));
DROP POLICY "Product variants follow product visibility" ON public.product_variants;
CREATE POLICY "Product variants follow product visibility" ON public.product_variants FOR SELECT
USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_id));

-- Repair role mismatches left by the former non-atomic browser operation.
UPDATE public.profiles p SET role = 'vendor'
WHERE p.role = 'customer' AND EXISTS
  (SELECT 1 FROM public.vendors v WHERE v.user_id = p.id AND v.status = 'approved');
COMMIT;
