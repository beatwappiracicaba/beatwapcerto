
-- 1. Fix RLS for Support Queue (Allow Producers/Sellers to view/pick requests)
DROP POLICY IF EXISTS "Producers/Sellers can view support queue" ON public.support_queue;
CREATE POLICY "Staff can view support queue" 
ON public.support_queue FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo IN ('Produtor', 'Vendedor', 'Compositor', 'Admin', 'Superadmin')
  )
);

DROP POLICY IF EXISTS "Staff can update support queue" ON public.support_queue;
CREATE POLICY "Staff can update support queue" 
ON public.support_queue FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo IN ('Produtor', 'Vendedor', 'Compositor', 'Admin', 'Superadmin')
  )
);

-- 2. Allow Deletion of Chats by Participants or Producers
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
CREATE POLICY "Participants and Staff can delete chats" 
ON public.chats FOR DELETE 
USING (
  (auth.uid() = owner_id) OR 
  (auth.uid() = ANY(participant_ids)) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo IN ('Produtor', 'Admin', 'Superadmin')
  )
);

-- 3. Notification System Improvements
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update existing notifications to be persistent if not set
UPDATE public.notifications SET expires_at = NULL WHERE expires_at IS NULL;

-- Policy to only show valid notifications (not expired)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own valid notifications" 
ON public.notifications FOR SELECT 
USING (
  auth.uid() = recipient_id AND 
  (expires_at IS NULL OR expires_at > now())
);

-- Trigger to create notification on new message
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  chat_participants UUID[];
  recipient UUID;
  sender_name TEXT;
  p_role TEXT;
BEGIN
  -- Get chat participants
  SELECT participant_ids INTO chat_participants FROM public.chats WHERE id = NEW.chat_id;
  
  -- Get sender name
  SELECT nome INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  IF sender_name IS NULL THEN sender_name := 'UsuÃ¡rio'; END IF;

  -- Notify all other participants
  FOREACH recipient IN ARRAY chat_participants
  LOOP
    IF recipient != NEW.sender_id THEN
      -- Insert notification (Expires in 24h)
      INSERT INTO public.notifications (
        recipient_id, 
        title, 
        message, 
        link, 
        type, 
        expires_at,
        metadata
      ) VALUES (
        recipient, 
        'Nova mensagem de ' || sender_name, 
        CASE WHEN length(NEW.content) > 50 THEN substring(NEW.content from 1 for 50) || '...' ELSE NEW.content END,
        '/chat', -- or specific chat link
        'chat_message',
        now() + interval '24 hours',
        jsonb_build_object('chat_id', NEW.chat_id, 'sender_id', NEW.sender_id)
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message_notification ON public.messages;
CREATE TRIGGER on_new_message_notification
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_message_notification();

-- 4. Function for Producers to send persistent notifications (Manual)
CREATE OR REPLACE FUNCTION public.send_persistent_notification(
  p_recipient_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo IN ('Produtor', 'Admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.notifications (recipient_id, title, message, link, type, expires_at)
  VALUES (p_recipient_id, p_title, p_message, p_link, 'system', NULL); -- NULL expires_at means persistent
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
