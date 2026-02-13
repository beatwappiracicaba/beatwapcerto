
-- Adicionar coluna lead_id na tabela artist_work_events para vincular com leads
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id);

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_artist_work_events_lead_id ON artist_work_events(lead_id);

-- Garantir que a coluna revenue exista (caso não tenha rodado o script anterior)
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0;
