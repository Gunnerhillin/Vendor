BEGIN;
ALTER TABLE public.products ADD COLUMN moderation_note text;

-- Preserve deliberate drafts; changing a published listing still requires review.
CREATE OR REPLACE FUNCTION public.review_product_details()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF TG_OP='UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      RAISE EXCEPTION 'Cannot transfer product details' USING ERRCODE='42501';
    END IF;
    IF TG_OP='DELETE' THEN target:=OLD.product_id; ELSE target:=NEW.product_id; END IF;
    -- A cascade follows an already authorized parent deletion.
    IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM products WHERE id=target) THEN RETURN OLD; END IF;
    IF NOT EXISTS(SELECT 1 FROM products p JOIN vendors v ON v.id=p.vendor_id
      WHERE p.id=target AND v.user_id=auth.uid() AND v.status='approved') THEN
      RAISE EXCEPTION 'An approved vendor is required' USING ERRCODE='42501';
    END IF;
    UPDATE products SET status=CASE WHEN status='draft' THEN 'draft' ELSE 'pending' END WHERE id=target;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

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
        IF NEW.status <> 'draft' THEN NEW.status := 'pending'; END IF;
      END IF;
    END IF;
  ELSIF NEW.status = 'approved' AND NOT EXISTS
    (SELECT 1 FROM public.vendors WHERE id = NEW.vendor_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Approve the vendor before approving its products';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.guard_product_feedback() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.price<=0 OR NEW.price::text='NaN' OR NEW.inventory_count<0 THEN
    RAISE EXCEPTION 'Price must be positive and stock cannot be negative';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' AND
    ((TG_OP='INSERT' AND NEW.moderation_note IS NOT NULL) OR
     (TG_OP='UPDATE' AND NEW.moderation_note IS DISTINCT FROM OLD.moderation_note)) THEN
    RAISE EXCEPTION 'Only administrators can write review feedback' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_product_feedback BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION guard_product_feedback();

-- Invoker rights retain RLS. Product and all images commit together or not at all.
CREATE FUNCTION public.save_vendor_product(product_id_arg uuid, payload jsonb) RETURNS public.products
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.products; brand public.vendors; img jsonb; image_path text; new_id uuid; n integer:=0; content_changed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  SELECT * INTO brand FROM vendors WHERE user_id=auth.uid() AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'An approved vendor is required' USING ERRCODE='42501'; END IF;
  IF payload ? 'variants' THEN RAISE EXCEPTION 'Variants must be managed separately'; END IF;
  IF product_id_arg IS NOT NULL THEN
    SELECT * INTO p FROM products WHERE id=product_id_arg AND vendor_id=brand.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found' USING ERRCODE='42501'; END IF;
    IF (payload->>'updated_at')::timestamptz IS DISTINCT FROM p.updated_at THEN
      RAISE EXCEPTION 'This product changed. Refresh before saving again.' USING ERRCODE='40001';
    END IF;
  ELSE
    p.id:=gen_random_uuid(); p.vendor_id:=brand.id; p.status:='draft'; p.description:=''; p.inventory_count:=0;
  END IF;
  content_changed:=payload ?| ARRAY['title','description','price','compare_at_price','category_id','images'];
  IF payload ? 'title' THEN p.title:=btrim(payload->>'title'); END IF;
  IF payload ? 'description' THEN p.description:=btrim(payload->>'description'); END IF;
  IF payload ? 'price' THEN p.price:=(payload->>'price')::numeric; END IF;
  IF payload ? 'compare_at_price' THEN p.compare_at_price:=(payload->>'compare_at_price')::numeric; END IF;
  IF payload ? 'category_id' THEN p.category_id:=(payload->>'category_id')::uuid; END IF;
  IF payload ? 'inventory_count' THEN
    IF (payload->>'inventory_count')::numeric <> trunc((payload->>'inventory_count')::numeric) THEN RAISE EXCEPTION 'Stock must be a whole number'; END IF;
    p.inventory_count:=(payload->>'inventory_count')::integer;
  END IF;
  IF payload ? 'status' THEN
    IF payload->>'status' IS NULL OR payload->>'status' NOT IN ('draft','pending') THEN RAISE EXCEPTION 'Invalid product status' USING ERRCODE='42501'; END IF;
    p.status:=payload->>'status';
  ELSIF content_changed AND p.status<>'draft' THEN p.status:='pending'; END IF;
  IF p.title IS NULL OR length(p.title) NOT BETWEEN 1 AND 160 OR p.price IS NULL OR p.price<=0 OR p.price>=1000000
    OR p.price::text='NaN' OR p.category_id IS NULL OR p.inventory_count IS NULL OR p.inventory_count<0
    OR p.description IS NULL OR length(p.description)>10000
    OR (p.compare_at_price IS NOT NULL AND (p.compare_at_price<=p.price OR p.compare_at_price::text='NaN')) THEN
    RAISE EXCEPTION 'Check title, price, category and stock. Compare-at price must exceed the selling price.';
  END IF;
  IF payload ? 'images' THEN
    IF jsonb_typeof(payload->'images') IS DISTINCT FROM 'array' OR jsonb_array_length(payload->'images')>8 THEN RAISE EXCEPTION 'Use up to eight images'; END IF;
    FOR img IN SELECT * FROM jsonb_array_elements(payload->'images') LOOP
      image_path:=replace(split_part(img->>'url','&path=',2),'%2F','/');
      IF NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=product_id_arg AND url=img->>'url') AND
        NOT (coalesce(img->>'url','') LIKE '/api/media?bucket=vendor-assets&path=products%2F'||auth.uid()::text||'%2F%'
          AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='vendor-assets' AND name=image_path)) THEN
        RAISE EXCEPTION 'Upload product images to your own account before saving';
      END IF;
    END LOOP;
  END IF;
  IF p.status='pending' AND (length(p.description)=0 OR
    CASE WHEN payload ? 'images' THEN jsonb_array_length(payload->'images')=0
    ELSE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=p.id) END) THEN
    RAISE EXCEPTION 'Add a description and at least one image before submitting for review';
  END IF;
  IF product_id_arg IS NULL THEN
    p.slug:=coalesce(nullif(trim(both '-' from regexp_replace(lower(p.title),'[^a-z0-9]+','-','g')),''),'product')||'-'||p.id::text;
    INSERT INTO products(id,vendor_id,category_id,title,slug,description,price,compare_at_price,status,inventory_count)
    VALUES(p.id,p.vendor_id,p.category_id,p.title,p.slug,p.description,p.price,p.compare_at_price,p.status,p.inventory_count);
  ELSE
    UPDATE products SET title=p.title,description=p.description,price=p.price,compare_at_price=p.compare_at_price,
      category_id=p.category_id,status=p.status,inventory_count=p.inventory_count WHERE id=p.id;
  END IF;
  IF payload ? 'images' THEN
    DELETE FROM product_images WHERE product_id=p.id;
    FOR img IN SELECT * FROM jsonb_array_elements(payload->'images') LOOP
      INSERT INTO product_images(product_id,url,alt,sort_order) VALUES(p.id,img->>'url',left(coalesce(img->>'alt',p.title),160),n);
      n:=n+1;
    END LOOP;
  END IF;
  SELECT * INTO p FROM products WHERE id=p.id;
  RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.save_vendor_product(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_vendor_product(uuid,jsonb) TO authenticated;

CREATE FUNCTION public.moderate_product(product_id_arg uuid, status_arg text, note_arg text, expected_updated_at timestamptz)
RETURNS public.products LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.products;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM products WHERE id=product_id_arg FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF expected_updated_at IS DISTINCT FROM p.updated_at THEN RAISE EXCEPTION 'This product changed. Refresh before reviewing again.' USING ERRCODE='40001'; END IF;
  IF status_arg IS NULL OR status_arg NOT IN ('approved','rejected') OR p.status='draft' THEN RAISE EXCEPTION 'Review a submitted product'; END IF;
  IF status_arg='rejected' AND length(btrim(coalesce(note_arg,'')))=0 THEN RAISE EXCEPTION 'Explain what the vendor needs to change'; END IF;
  IF length(note_arg)>2000 THEN RAISE EXCEPTION 'Keep feedback under 2000 characters'; END IF;
  IF status_arg='approved' AND (p.price<=0 OR p.inventory_count<0 OR length(btrim(p.description))=0 OR
    NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=p.id)) THEN RAISE EXCEPTION 'Listing needs a description, image, valid price and stock'; END IF;
  UPDATE products SET status=status_arg, moderation_note=CASE WHEN status_arg='approved' THEN NULL ELSE btrim(note_arg) END WHERE id=p.id RETURNING * INTO p;
  RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.moderate_product(uuid,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_product(uuid,text,text,timestamptz) TO authenticated;
COMMIT;
