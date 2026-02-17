-- Fix search_path for SECURITY DEFINER functions to avoid role-mutable search_path
-- and tighten notifications INSERT policy

-- 1) Set search_path = public on critical functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.is_produtor() SET search_path = public;
ALTER FUNCTION public.send_notification(uuid, text, text, text) SET search_path = public;
ALTER FUNCTION public.send_broadcast_notification(text, text, text, text) SET search_path = public;
ALTER FUNCTION public.request_support(text, jsonb) SET search_path = public;
ALTER FUNCTION public.pick_support_request(uuid) SET search_path = public;
ALTER FUNCTION public.clear_chat_history(uuid) SET search_path = public;
ALTER FUNCTION public.mark_chat_read(uuid) SET search_path = public;
ALTER FUNCTION public.update_artist_cache(uuid, text) SET search_path = public;
ALTER FUNCTION public.handle_new_message_notification() SET search_path = public;
ALTER FUNCTION public.send_persistent_notification(uuid, text, text, text) SET search_path = public;
ALTER FUNCTION public.get_seller_stats(uuid) SET search_path = public;

-- 2) Tighten notifications INSERT policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'System can insert notifications'
  ) THEN
    EXECUTE 'DROP POLICY "System can insert notifications" ON public.notifications';
  END IF;
END$$;

-- Ensure idempotency for the insert policy and (re)create it without IF NOT EXISTS (not supported)
DROP POLICY IF EXISTS "Insert notifications (self or producer)" ON public.notifications;
CREATE POLICY "Insert notifications (self or producer)"
  ON public.notifications FOR INSERT
  WITH CHECK (
    recipient_id = auth.uid() OR public.is_produtor()
  );

-- Note: Enable HaveIBeenPwned compromised password check via Supabase Dashboard:
-- Authentication -> Settings -> Passwords -> Enable "Check for compromised passwords".

-- 3) Enable RLS and policies for public.settings (read-only público; escrita por Produtor/Admin)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Limpeza de policies pré-existentes
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.settings', pol.policyname);
  END LOOP;
END $$;

-- Leitura: permitir que qualquer usuário (inclusive anon) leia as configurações públicas
CREATE POLICY "Allow public read of settings"
ON public.settings FOR SELECT
USING (true);

-- Escrita: apenas Produtor/Admin/Superadmin autenticados podem inserir/atualizar
CREATE POLICY "Producers/Admin can insert settings"
ON public.settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.cargo IN ('Produtor','Admin','Superadmin')
  )
);

CREATE POLICY "Producers/Admin can update settings"
ON public.settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.cargo IN ('Produtor','Admin','Superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.cargo IN ('Produtor','Admin','Superadmin')
  )
);
