-- Consolidated schema update for Finance, Leads and Calendar

-- 1. Add Finance Columns to artist_work_events
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS artist_share DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS house_cut DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS seller_commission DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado'));

-- 2. Add Lead Relation to artist_work_events
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id);

-- 3. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_artist_work_events_lead_id ON artist_work_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_artist_work_events_seller_id ON artist_work_events(seller_id);
CREATE INDEX IF NOT EXISTS idx_artist_work_events_status ON artist_work_events(status);

-- 4. RLS Policies

-- Enable RLS if not already enabled (idempotent)
ALTER TABLE artist_work_events ENABLE ROW LEVEL SECURITY;

-- Producer can manage financials
DROP POLICY IF EXISTS "Producer can update financials" ON artist_work_events;
CREATE POLICY "Producer can update financials" ON artist_work_events
FOR UPDATE
USING (public.is_produtor())
WITH CHECK (public.is_produtor());

-- Seller can see their own sales/events
DROP POLICY IF EXISTS "Seller see own sales" ON artist_work_events;
CREATE POLICY "Seller see own sales" ON artist_work_events
FOR SELECT
USING (seller_id = auth.uid());

-- Vendedores can view all artist events (for calendar purposes)
-- This might overlap with existing policies but ensures access
DROP POLICY IF EXISTS "Vendedores view all events" ON artist_work_events;
CREATE POLICY "Vendedores view all events" ON artist_work_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND cargo = 'Vendedor'
  )
);

-- Vendedores can insert events (e.g. from calendar or leads)
DROP POLICY IF EXISTS "Vendedores insert events" ON artist_work_events;
CREATE POLICY "Vendedores insert events" ON artist_work_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND cargo = 'Vendedor'
  )
);
