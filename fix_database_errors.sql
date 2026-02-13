-- 1. Atualizar Check Constraint da tabela leads para aceitar 'cancelado'
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('novo', 'negociacao', 'fechado', 'perdido', 'cancelado'));

-- 2. Atualizar Check Constraint da tabela artist_work_events para aceitar 'cancelado' e 'proposta'
ALTER TABLE public.artist_work_events DROP CONSTRAINT IF EXISTS artist_work_events_status_check;
ALTER TABLE public.artist_work_events ADD CONSTRAINT artist_work_events_status_check 
  CHECK (status IN ('agendado', 'pendente', 'concluido', 'cancelado', 'bloqueado', 'proposta', 'negociacao'));

-- 3. Garantir que as colunas necessárias existam na tabela notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        ALTER TABLE public.notifications ADD COLUMN recipient_id UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'info';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;
END $$;

-- 4. Atualizar Políticas de Segurança (RLS) para Notificações
-- Permitir que qualquer usuário autenticado crie notificações (necessário para Vendedores notificarem Artistas)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Permitir que usuários vejam apenas suas próprias notificações
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = recipient_id);

-- Permitir que usuários marquem suas notificações como lidas (update)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id);
