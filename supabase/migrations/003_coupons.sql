-- Coupons table for promo codes
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2),
  max_discount NUMERIC(10,2),
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert some starter coupons for launch
INSERT INTO coupons (code, type, value, min_order_amount, max_uses, expires_at) VALUES
  ('WELCOME10', 'percentage', 10, 25, NULL, '2027-01-01'),
  ('FIRST20', 'percentage', 20, 50, 100, '2026-12-31'),
  ('SAVE5', 'fixed', 5, 20, NULL, '2027-01-01');

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (for validation)
CREATE POLICY "Anyone can validate coupons" ON coupons
  FOR SELECT USING (is_active = true);

-- Only service role can manage
CREATE POLICY "Service role manages coupons" ON coupons
  FOR ALL USING (auth.role() = 'service_role');
