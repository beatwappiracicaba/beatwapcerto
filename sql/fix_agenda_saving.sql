-- Script Unificado para Corrigir Salvamento de Agenda e Leads
-- Execute este script no SQL Editor do Supabase para corrigir todos os erros de permissão e colunas

-- 1. Garantir que todas as colunas necessárias existem na tabela de eventos
ALTER TABLE artist_work_events 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id),
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Corrigir a restrição de STATUS (Constraint)
-- Removemos qualquer constraint antiga para evitar conflitos
ALTER TABLE artist_work_events DROP CONSTRAINT IF EXISTS artist_work_events_status_check;

-- Adicionamos a constraint correta que aceita todos os status do fluxo de vendas
ALTER TABLE artist_work_events 
ADD CONSTRAINT artist_work_events_status_check 
CHECK (status IN ('pendente', 'pago', 'cancelado', 'proposta', 'negociacao', 'fechado'));

-- 3. Atualizar Permissões (RLS) para Vendedores
-- Habilitar RLS
ALTER TABLE public.artist_work_events ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para recriar corretamente
DROP POLICY IF EXISTS "Vendedor ver eventos" ON public.artist_work_events;
DROP POLICY IF EXISTS "Vendedor criar eventos" ON public.artist_work_events;
DROP POLICY IF EXISTS "Vendedor atualizar eventos" ON public.artist_work_events;
DROP POLICY IF EXISTS "Vendedor deletar eventos" ON public.artist_work_events;
DROP POLICY IF EXISTS artist_work_events_select ON public.artist_work_events;
DROP POLICY IF EXISTS artist_work_events_insert ON public.artist_work_events;
DROP POLICY IF EXISTS artist_work_events_update ON public.artist_work_events;
DROP POLICY IF EXISTS artist_work_events_delete ON public.artist_work_events;

-- Criar políticas abrangentes para Vendedores, Produtores e os próprios Artistas

-- SELECT: Artista vê seus shows, Produtor vê tudo, Vendedor vê tudo (para checar disponibilidade)
CREATE POLICY "Acesso total a eventos" ON public.artist_work_events 
FOR SELECT 
USING (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);

-- INSERT: Produtor e Vendedor podem criar eventos para qualquer um. Artista cria para si mesmo.
CREATE POLICY "Criar eventos" ON public.artist_work_events 
FOR INSERT 
WITH CHECK (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);

-- UPDATE: Produtor e Vendedor podem editar. Artista edita os seus.
CREATE POLICY "Atualizar eventos" ON public.artist_work_events 
FOR UPDATE 
USING (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);

-- DELETE: Produtor e Vendedor podem deletar. Artista deleta os seus.
CREATE POLICY "Deletar eventos" ON public.artist_work_events 
FOR DELETE 
USING (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_artist_work_events_lead_id ON artist_work_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_artist_work_events_seller_id ON artist_work_events(seller_id);
