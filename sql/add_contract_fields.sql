-- Add contract fields to artist_work_events
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS has_contract BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contract_url TEXT;

-- Create index for performance on filtering
CREATE INDEX IF NOT EXISTS idx_artist_work_events_has_contract ON artist_work_events(has_contract);

COMMENT ON COLUMN artist_work_events.has_contract IS 'Indica se o evento possui contrato assinado (impede ocultação automática se cancelado)';
COMMENT ON COLUMN artist_work_events.contract_url IS 'URL do arquivo de contrato assinado';
