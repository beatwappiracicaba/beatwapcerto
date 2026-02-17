-- Reset completo das políticas da tabela public.notifications e recriação canônica
-- Seguro para rodar múltiplas vezes

-- Garantir RLS habilitado e colunas auxiliares
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Remover TODAS as policies existentes da tabela notifications (independente do nome)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
  END LOOP;
END $$;

-- Recriar políticas padrão
CREATE POLICY "Users can view their own valid notifications"
ON public.notifications FOR SELECT
USING (
  auth.uid() = recipient_id
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Permitir inserts por si mesmo ou por produtores/admin
CREATE POLICY "Insert notifications (self or producer)"
ON public.notifications FOR INSERT
WITH CHECK (
  (recipient_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.cargo IN ('Produtor','Admin','Superadmin')
  )
);

-- Opcional: limpar trigger/função antes de recriar em outro script
DROP TRIGGER IF EXISTS on_new_message_notification ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message_notification();

-- Pronto. Agora rode seu script principal que recria a função/trigger.

