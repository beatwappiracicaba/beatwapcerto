-- CORREÇÃO DE ERROS DE PERMISSÃO E CONSTRAINTS
-- Execute este script no SQL Editor do Supabase para corrigir os erros:
-- 1. "violates check constraint leads_status_check"
-- 2. "Failed to load resource: 403" (Notificações)

-- 1. Atualizar status permitidos na tabela LEADS (adiciona 'cancelado')
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('novo', 'negociacao', 'fechado', 'perdido', 'cancelado'));

-- 2. Atualizar status permitidos na tabela ARTIST_WORK_EVENTS (Agenda)
ALTER TABLE public.artist_work_events DROP CONSTRAINT IF EXISTS artist_work_events_status_check;
ALTER TABLE public.artist_work_events ADD CONSTRAINT artist_work_events_status_check 
CHECK (status IN ('pendente', 'pago', 'cancelado', 'proposta', 'negociacao', 'fechado'));

-- 3. Corrigir permissão de envio de notificações (Erro 403)
-- Permite que qualquer usuário logado (Vendedor/Produtor) envie notificações
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
);

-- 4. Garantir que a tabela de notificações tenha as colunas necessárias
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
