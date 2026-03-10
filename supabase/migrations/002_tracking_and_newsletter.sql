-- =============================================
-- VENDER MARKETPLACE - MIGRATION 002
-- Adds: tracking numbers, shipping carrier, newsletter subscribers
-- =============================================

-- 1. Add tracking columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. Add tracking to orders table as well (for overall order tracking)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;

-- 3. Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT DEFAULT 'footer'
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active);

-- Enable RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public can insert (subscribe), only admins can read/manage
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage newsletter" ON newsletter_subscribers FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admins can update newsletter" ON newsletter_subscribers FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Admins can delete newsletter" ON newsletter_subscribers FOR DELETE USING (get_user_role() = 'admin');

-- 4. Update vendor application commission_rate default to 0.25 (25%)
ALTER TABLE vendors ALTER COLUMN commission_rate SET DEFAULT 0.2500;
