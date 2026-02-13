-- Atualizações para o Módulo de Vendedor e Leads

-- 1. Garantir que a tabela LEADS tenha todas as colunas necessárias
-- O erro 400 provavelmente ocorre porque essas colunas faltam no banco
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES profiles(id);

-- 2. Atualizar a tabela PROPOSALS para incluir Nome do Cliente e permitir arquivos
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS title TEXT; -- Para dar um nome à proposta

-- 3. Atualizar restrição de STATUS em artist_work_events para suportar estados de negociação
-- Primeiro removemos a restrição antiga se existir
ALTER TABLE artist_work_events DROP CONSTRAINT IF EXISTS artist_work_events_status_check;

-- Adicionamos a nova restrição com mais estados
ALTER TABLE artist_work_events 
ADD CONSTRAINT artist_work_events_status_check 
CHECK (status IN ('pendente', 'pago', 'cancelado', 'proposta', 'negociacao', 'fechado'));

-- 4. Criar bucket para arquivos de propostas (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_docs', 'proposal_docs', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de armazenamento para proposal_docs
CREATE POLICY "Arquivos de proposta são públicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposal_docs');

CREATE POLICY "Vendedores podem fazer upload de propostas"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proposal_docs' AND auth.role() = 'authenticated');

CREATE POLICY "Vendedores podem atualizar suas propostas"
ON storage.objects FOR UPDATE
USING (bucket_id = 'proposal_docs' AND auth.uid() = owner);

CREATE POLICY "Vendedores podem deletar suas propostas"
ON storage.objects FOR DELETE
USING (bucket_id = 'proposal_docs' AND auth.uid() = owner);
