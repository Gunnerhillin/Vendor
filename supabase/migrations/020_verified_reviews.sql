BEGIN;
DROP POLICY IF EXISTS "Customers can create reviews" ON reviews;
DROP POLICY IF EXISTS "Customers can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Customers can delete own reviews" ON reviews;
CREATE FUNCTION save_verified_review(customer_arg uuid,product_arg uuid,rating_arg integer,comment_arg text DEFAULT NULL,remove_arg boolean DEFAULT false) RETURNS reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p products;r reviews;
BEGIN
 SELECT * INTO p FROM products WHERE id=product_arg FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
 IF remove_arg THEN
  DELETE FROM reviews WHERE customer_id=customer_arg AND product_id=product_arg RETURNING * INTO r;
 ELSE
  IF rating_arg IS NULL OR rating_arg NOT BETWEEN 1 AND 5 OR length(coalesce(comment_arg,''))>3000 THEN RAISE EXCEPTION 'Choose a rating from 1 to 5 and a review of at most 3000 characters'; END IF;
  IF NOT EXISTS(SELECT 1 FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.customer_id=customer_arg AND o.payment_processed_at IS NOT NULL AND i.product_id=product_arg AND i.delivered_at IS NOT NULL) OR EXISTS(SELECT 1 FROM vendors WHERE id=p.vendor_id AND user_id=customer_arg) THEN RAISE EXCEPTION 'Reviews require your own delivered purchase from another brand'; END IF;
  IF EXISTS(SELECT 1 FROM reviews WHERE customer_id=customer_arg AND product_id=product_arg) THEN RAISE EXCEPTION 'You already reviewed this product'; END IF;
  INSERT INTO reviews(customer_id,product_id,rating,comment) VALUES(customer_arg,product_arg,rating_arg,btrim(comment_arg)) RETURNING * INTO r;
 END IF;
 UPDATE products SET rating_avg=(SELECT coalesce(round(avg(rating),2),0) FROM reviews WHERE product_id=product_arg),rating_count=(SELECT count(*) FROM reviews WHERE product_id=product_arg) WHERE id=product_arg;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION save_verified_review(uuid,uuid,integer,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION save_verified_review(uuid,uuid,integer,text,boolean) TO service_role;
COMMIT;
