-- Add location fields to vendors for local marketplace features
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_local boolean DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS offers_local_pickup boolean DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pickup_address text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pickup_instructions text;

-- Index for fast local vendor lookups
CREATE INDEX IF NOT EXISTS idx_vendors_local ON vendors (is_local) WHERE is_local = true;
CREATE INDEX IF NOT EXISTS idx_vendors_city_state ON vendors (city, state);
