-- =============================================
-- Migration 006: Flash Deal vendor request + admin approval
-- =============================================

-- Add vendor-facing fields to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Update RLS: vendors can create/view their own deals
CREATE POLICY "Vendors can view own deals" ON deals
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors can create deals" ON deals
  FOR INSERT WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Vendors can update own pending deals" ON deals
  FOR UPDATE USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    AND status = 'pending'
  );

CREATE INDEX IF NOT EXISTS idx_deals_vendor ON deals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
