BEGIN;
CREATE TABLE contact_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,email text NOT NULL,subject text NOT NULL,message text NOT NULL,status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','resolved')),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX contact_messages_created ON contact_messages(created_at);
CREATE INDEX contact_messages_email_created ON contact_messages(email,created_at);
CREATE INDEX newsletter_subscribed ON newsletter_subscribers(subscribed_at);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read contact messages" ON contact_messages FOR SELECT USING(get_user_role()='admin');
CREATE POLICY "Admins resolve contact messages" ON contact_messages FOR UPDATE USING(get_user_role()='admin') WITH CHECK(get_user_role()='admin');
GRANT SELECT,UPDATE ON contact_messages TO authenticated;
GRANT ALL ON contact_messages TO service_role;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
CREATE FUNCTION capture_public_message(kind_arg text,email_arg text,name_arg text DEFAULT NULL,subject_arg text DEFAULT NULL,message_arg text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE email_value text:=lower(btrim(email_arg));
BEGIN
 IF email_value IS NULL OR length(email_value)>254 OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
 IF kind_arg IS NULL OR kind_arg NOT IN ('contact','newsletter') THEN RAISE EXCEPTION 'Invalid form'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('public-form:'||kind_arg));
 IF kind_arg='contact' THEN
  IF length(btrim(coalesce(name_arg,''))) NOT BETWEEN 1 AND 100 OR length(btrim(coalesce(message_arg,''))) NOT BETWEEN 10 AND 5000 OR subject_arg IS NULL OR subject_arg NOT IN ('order','product','vendor','partnership','feedback','other') THEN RAISE EXCEPTION 'Check your name, subject and message (10–5000 characters)'; END IF;
  IF (SELECT count(*) FROM contact_messages WHERE created_at>now()-interval '1 hour')>=100 OR (SELECT count(*) FROM contact_messages WHERE email=email_value AND created_at>now()-interval '1 hour')>=3 THEN RAISE EXCEPTION 'Please wait before sending another message'; END IF;
  INSERT INTO contact_messages(name,email,subject,message) VALUES(btrim(name_arg),email_value,subject_arg,btrim(message_arg));
 ELSE
  IF EXISTS(SELECT 1 FROM newsletter_subscribers WHERE email=email_value) THEN RETURN; END IF;
  IF (SELECT count(*) FROM newsletter_subscribers WHERE subscribed_at>now()-interval '1 hour')>=100 THEN RAISE EXCEPTION 'Please try again later'; END IF;
  INSERT INTO newsletter_subscribers(email,source) VALUES(email_value,'footer') ON CONFLICT(email) DO NOTHING;
 END IF;
END $$;
REVOKE ALL ON FUNCTION capture_public_message(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION capture_public_message(text,text,text,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
