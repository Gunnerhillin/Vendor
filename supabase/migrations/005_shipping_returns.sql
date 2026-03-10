-- =============================================
-- Migration 005: Vendor-managed shipping & returns
-- =============================================

-- ─── VENDOR SHIPPING SETTINGS ────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS offers_free_shipping BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS free_shipping_minimum DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shipping_policy TEXT DEFAULT NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS processing_time TEXT DEFAULT '1-3 business days';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS return_policy TEXT DEFAULT NULL;

-- ─── ORDER-LEVEL RETURN FIELDS ───────────────
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT NULL
  CHECK (return_status IS NULL OR return_status IN ('requested', 'approved', 'denied', 'completed'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_reason TEXT DEFAULT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_resolved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_resolved_by UUID DEFAULT NULL REFERENCES profiles(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_notes TEXT DEFAULT NULL;

-- ─── SHIPPING INTEGRATION WEBHOOK TOKEN ──────
-- Vendors can generate an API key for ShippingEasy / other platforms
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shipping_webhook_token TEXT DEFAULT NULL;

-- ─── RETURN REQUESTS TABLE (for tracking history) ──
CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'denied', 'completed')),
  admin_override BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_item ON return_requests(order_item_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_vendor ON return_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);

-- ─── RLS POLICIES FOR RETURN REQUESTS ────────
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view their own return requests
CREATE POLICY "Customers can view own returns" ON return_requests
  FOR SELECT USING (auth.uid() = customer_id);

-- Customers can create return requests
CREATE POLICY "Customers can create returns" ON return_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Vendors can view returns for their products
CREATE POLICY "Vendors can view their returns" ON return_requests
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

-- Vendors can update return status
CREATE POLICY "Vendors can update returns" ON return_requests
  FOR UPDATE USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

-- Admins can do everything with returns
CREATE POLICY "Admins full access to returns" ON return_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── SITE SETTINGS TABLE (for global return policy etc.) ──
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default return policy
INSERT INTO site_settings (key, value) VALUES (
  'return_policy',
  '{"enabled": true, "window_days": 30, "condition": "Items must be in original, unused condition with tags attached. Custom or personalized items are non-returnable.", "process": "Contact our customer service team to initiate a return. You will receive a return shipping label via email."}'
) ON CONFLICT (key) DO NOTHING;

-- RLS for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update site settings" ON site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
