-- SCRIPT DE RESET COMPLETO DO SISTEMA DE CHAT V2
-- ATENÇÃO: ESTE SCRIPT APAGARÁ TODOS OS DADOS DE CHAT E NOTIFICAÇÕES EXISTENTES.
-- Execute no Supabase SQL Editor.

-- 1. DROP EM TABELAS ANTIGAS (Limpeza)
DROP TABLE IF EXISTS support_queue CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CRIAÇÃO DAS TABELAS

-- 2.1 Notificações
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'announcement'
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Chats
CREATE TABLE chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  type TEXT DEFAULT 'support', -- 'support', 'direct'
  status TEXT DEFAULT 'active', -- 'active', 'archived'
  participant_ids UUID[] DEFAULT '{}', -- Array de IDs dos participantes
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Quem criou
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Quem está atendendo (Produtor/Vendedor)
  metadata JSONB DEFAULT '{}'::jsonb -- Dados extras
);

-- 2.3 Mensagens
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2.4 Fila de Suporte
CREATE TABLE support_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_needed TEXT NOT NULL, -- 'produtor', 'vendedor', 'compositor'
  metadata JSONB DEFAULT '{}'::jsonb, -- Snapshot de dados (cidade, estilo)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

-- 3. RLS (SEGURANÇA)

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_queue ENABLE ROW LEVEL SECURITY;

-- 3.1 Policies Notificações
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true); -- Geralmente via RPC, mas permite insert direto se necessário

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- 3.2 Policies Chats
-- Visualizar: Participantes OU quem está atendendo
CREATE POLICY "Users can view chats they are involved in" ON chats
  FOR SELECT USING (
    auth.uid() = ANY(participant_ids) 
    OR auth.uid() = assigned_to
    OR auth.uid() = owner_id
    OR (
      -- Produtores podem ver chats de suporte não atribuídos ou gerais? 
      -- Por segurança, manter restrito a envolvidos, o 'pick' resolve a entrada.
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Produtor')
    )
  );

CREATE POLICY "Users can insert chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update chats they are involved in" ON chats
  FOR UPDATE USING (
    auth.uid() = ANY(participant_ids) 
    OR auth.uid() = assigned_to
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Produtor')
  );

CREATE POLICY "Users can delete chats" ON chats
  FOR DELETE USING (
    auth.uid() = owner_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Produtor')
  );

-- 3.3 Policies Mensagens
CREATE POLICY "Users can view messages of their chats" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id
      AND (
        auth.uid() = ANY(chats.participant_ids) 
        OR auth.uid() = chats.assigned_to
        OR auth.uid() = chats.owner_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Produtor')
      )
    )
  );

CREATE POLICY "Users can insert messages in their chats" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id
      AND (
        auth.uid() = ANY(chats.participant_ids) 
        OR auth.uid() = chats.assigned_to
        OR auth.uid() = chats.owner_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Produtor')
      )
    )
  );

-- 3.4 Policies Fila de Suporte
CREATE POLICY "Users can insert their own requests" ON support_queue
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own requests" ON support_queue
  FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "Producers can view all requests" ON support_queue
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Produtor'));

CREATE POLICY "Sellers can view seller requests" ON support_queue
  FOR SELECT USING (role_needed = 'vendedor' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Vendedor'));

CREATE POLICY "Composers can view composer requests" ON support_queue
  FOR SELECT USING (role_needed = 'compositor' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Compositor'));


-- 4. FUNÇÕES RPC (BACKEND LOGIC)

-- 4.1 Enviar Notificação
CREATE OR REPLACE FUNCTION send_notification(
  p_recipient_id uuid,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO notifications (recipient_id, title, message, link, type, read)
  VALUES (p_recipient_id, p_title, p_message, p_link, 'info', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Enviar Broadcast (Massa)
CREATE OR REPLACE FUNCTION send_broadcast_notification(
  p_title text,
  p_message text,
  p_target_role text DEFAULT NULL,
  p_link text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_user RECORD;
  v_sender_role TEXT;
BEGIN
  SELECT cargo INTO v_sender_role FROM profiles WHERE id = auth.uid();
  
  IF v_sender_role <> 'Produtor' THEN
    RAISE EXCEPTION 'Apenas Produtores podem enviar notificações em massa.';
  END IF;

  FOR v_user IN 
    SELECT id FROM profiles 
    WHERE (p_target_role IS NULL OR p_target_role = 'all' OR cargo = p_target_role)
  LOOP
    INSERT INTO notifications (recipient_id, title, message, link, type, read)
    VALUES (v_user.id, p_title, p_message, p_link, 'announcement', FALSE);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Solicitar Suporte (Entrar na Fila)
CREATE OR REPLACE FUNCTION request_support(
  p_role_needed text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO support_queue (requester_id, role_needed, metadata, active)
  VALUES (auth.uid(), p_role_needed, p_metadata, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Atender Solicitação (Sair da Fila e Criar Chat)
CREATE OR REPLACE FUNCTION pick_support_request(
  p_request_id uuid
) RETURNS uuid AS $$
DECLARE
  v_request RECORD;
  v_chat_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Buscar request
  SELECT * INTO v_request FROM support_queue WHERE id = p_request_id AND active = TRUE;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou já atendida.';
  END IF;

  -- Criar Chat
  INSERT INTO chats (owner_id, participant_ids, assigned_to, type, last_message, last_message_time)
  VALUES (
    v_request.requester_id, 
    ARRAY[v_request.requester_id, auth.uid()], 
    auth.uid(), 
    'support', 
    'Atendimento iniciado.', 
    now()
  )
  RETURNING id INTO v_chat_id;

  -- Desativar request na fila
  UPDATE support_queue SET active = FALSE WHERE id = p_request_id;

  -- Enviar mensagem inicial automática
  INSERT INTO messages (chat_id, sender_id, content)
  VALUES (v_chat_id, auth.uid(), 'Olá! Aceitei sua solicitação. Como posso ajudar?');

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.5 Limpar Chat
CREATE OR REPLACE FUNCTION clear_chat_history(p_chat_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM chats 
    WHERE id = p_chat_id 
    AND (
      auth.uid() = ANY(participant_ids) 
      OR auth.uid() = assigned_to
      OR auth.uid() = owner_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'Produtor')
    )
  ) THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  DELETE FROM messages WHERE chat_id = p_chat_id;
  DELETE FROM chats WHERE id = p_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.6 Marcar Chat como Lido
CREATE OR REPLACE FUNCTION mark_chat_read(p_chat_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE messages 
  SET read = TRUE 
  WHERE chat_id = p_chat_id 
  AND sender_id != auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
