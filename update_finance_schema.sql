
-- Add finance columns to artist_work_events
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS artist_share DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS house_cut DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS seller_commission DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado'));

-- Policy to allow Producer to update these fields
CREATE POLICY "Producer can update financials" ON artist_work_events
FOR UPDATE
USING (public.is_produtor())
WITH CHECK (public.is_produtor());

-- Ensure Seller can see events they are linked to (if not already covered)
-- The previous policy covered 'seller' role generally or explicit id check.
-- Let's ensure sellers can see events where they are the seller_id
CREATE POLICY "Seller see own sales" ON artist_work_events
FOR SELECT
USING (seller_id = auth.uid());
