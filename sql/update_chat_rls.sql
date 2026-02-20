-- 1. Alterar tabela messages para adicionar receiver_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'receiver_id') THEN
        ALTER TABLE messages ADD COLUMN receiver_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Habilitar RLS (caso não esteja habilitado)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar conflitos (opcional, mas recomendado para limpeza)
DROP POLICY IF EXISTS "Users can see their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages as sender" ON messages;

-- 4. Criar Política de Leitura (SELECT)
-- Permite que o usuário veja mensagens onde ele é o remetente OU o destinatário
CREATE POLICY "Users can see their own messages" ON messages
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- 5. Criar Política de Inserção (INSERT)
-- Permite inserir apenas se o sender_id for o próprio usuário autenticado
CREATE POLICY "Users can insert messages as sender" ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

-- 6. Garantir índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
