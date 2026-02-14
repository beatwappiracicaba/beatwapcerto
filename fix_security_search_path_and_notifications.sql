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

CREATE POLICY IF NOT EXISTS "Insert notifications (self or producer)"
ON public.notifications FOR INSERT
WITH CHECK (
  recipient_id = auth.uid() OR public.is_produtor()
);

-- Note: Enable HaveIBeenPwned compromised password check via Supabase Dashboard:
-- Authentication -> Settings -> Passwords -> Enable "Check for compromised passwords".

