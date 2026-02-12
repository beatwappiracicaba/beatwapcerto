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

-- 7. Adicionar políticas para support_queue (CRUCIAL para permitir exclusão)
-- Permite que Produtores e Vendedores excluam da fila (ao atender)
-- Assumindo que 'support_queue' já existe e tem RLS ativado
ALTER TABLE support_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert request" ON support_queue;
DROP POLICY IF EXISTS "Providers can delete requests" ON support_queue;
DROP POLICY IF EXISTS "Providers can select requests" ON support_queue;

-- Qualquer usuário autenticado pode criar solicitação
CREATE POLICY "Anyone can insert request" ON support_queue
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Produtores e Vendedores podem ver a fila
-- (Ajuste a lógica conforme necessário, aqui simplificado para todos verem ou baseado em role se possível)
-- Como RLS baseado em claim/perfil é complexo sem função auxiliar, vamos permitir SELECT autenticado para simplificar,
-- ou idealmente fazer join com profiles. Para MVP, select publico autenticado:
CREATE POLICY "Authenticated can see queue" ON support_queue
FOR SELECT
USING (auth.role() = 'authenticated');

-- PERMITIR EXCLUSÃO: O usuário que atende (Produtor/Vendedor) precisa poder deletar
-- Se não conseguirmos checar o cargo facilmente no RLS sem performance hit,
-- podemos permitir que qualquer autenticado delete (confiando no app) OU
-- criar uma função RPC. Por enquanto, vamos liberar DELETE para autenticados
-- para garantir que o 'pickSupportRequest' funcione.
CREATE POLICY "Authenticated can delete from queue" ON support_queue
FOR DELETE
USING (auth.role() = 'authenticated');
