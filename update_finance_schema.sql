-- Add columns for financial receipts and manager details to artist_work_events
ALTER TABLE artist_work_events
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS manager_cut NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS receipt_artist TEXT,
ADD COLUMN IF NOT EXISTS receipt_seller TEXT,
ADD COLUMN IF NOT EXISTS receipt_house TEXT,
ADD COLUMN IF NOT EXISTS receipt_manager TEXT;

-- Update RLS policies to ensure parties can view their respective receipts
-- (Assuming RLS is enabled, we might need specific policies for reading these columns, 
-- but usually row-level access is enough. If column-level security is needed, it's more complex.
-- For now, assuming if you can see the row, you can see the columns, but frontend filters what is shown.)

-- Add comment to explain columns
COMMENT ON COLUMN artist_work_events.receipt_artist IS 'URL do comprovante de pagamento do artista';
COMMENT ON COLUMN artist_work_events.receipt_seller IS 'URL do comprovante de pagamento do vendedor';
COMMENT ON COLUMN artist_work_events.receipt_house IS 'URL do comprovante de pagamento da produtora/manutenção';
COMMENT ON COLUMN artist_work_events.receipt_manager IS 'URL do comprovante de pagamento do empresário';
