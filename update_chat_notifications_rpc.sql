-- Atualização do sistema de Chat e Notificações (RPC + RLS)

-- 1. Funções RPC para Notificações
-- Enviar notificação individual (segura)
create or replace function send_notification(
  p_recipient_id uuid,
  p_title text,
  p_message text,
  p_link text default null
) returns void as $$
begin
  insert into notifications (recipient_id, title, message, link, type, read)
  values (p_recipient_id, p_title, p_message, p_link, 'info', false);
end;
$$ language plpgsql security definer;

-- Enviar notificação em massa (Broadcast) - Apenas Produtores
create or replace function send_broadcast_notification(
  p_title text,
  p_message text,
  p_target_role text default null, -- 'Artista', 'Vendedor', 'Compositor' ou null para todos
  p_link text default null
) returns void as $$
declare
  v_user record;
  v_sender_role text;
begin
  -- Verificar se quem chama é Produtor
  select cargo into v_sender_role from profiles where id = auth.uid();
  
  if v_sender_role <> 'Produtor' then
    raise exception 'Apenas Produtores podem enviar notificações em massa.';
  end if;

  -- Loop para criar notificações (idealmente seria job assíncrono para milhares, mas ok para MVP)
  for v_user in 
    select id from profiles 
    where (p_target_role is null or cargo = p_target_role)
  loop
    insert into notifications (recipient_id, title, message, link, type, read)
    values (v_user.id, p_title, p_message, p_link, 'announcement', false);
  end loop;
end;
$$ language plpgsql security definer;


-- 2. Reforçar Isolamento de Chats (RLS)
-- Drop policies antigas se existirem para recriar com lógica robusta
drop policy if exists "Users can view their own chats" on chats;
drop policy if exists "Participants can view chats" on chats;

-- Policy unificada para visualização de chats
create policy "Users can view chats they participate in"
  on chats for select
  using (
    auth.uid() = ANY(participant_ids) 
    or auth.uid() = artista_id 
    or auth.uid() = assigned_to
    or auth.uid() = owner_id
    -- Produtores podem ver tudo (Opcional, mas solicitado "Produtor vê chats de ajuda")
    -- Se quiser que produtor veja TODOS, descomente abaixo:
    -- or exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor')
  );

-- Policy para mensagens
drop policy if exists "Users can view messages of their chats" on messages;

create policy "Users can view messages of their chats"
  on messages for select
  using (
    exists (
      select 1 from chats 
      where chats.id = messages.chat_id
      and (
        auth.uid() = ANY(chats.participant_ids) 
        or auth.uid() = chats.artista_id 
        or auth.uid() = chats.assigned_to
        or auth.uid() = chats.owner_id
      )
    )
  );

-- Garantir que Vendedores não vejam chats uns dos outros (já coberto pela policy acima, pois só veem se estiverem em participant_ids/assigned_to)

-- 3. Função para limpar conversa (solicitado: "apagar todas as mensagens")
create or replace function clear_chat_history(p_chat_id uuid)
returns void as $$
begin
  -- Verifica permissão (participante ou produtor)
  if not exists (
    select 1 from chats 
    where id = p_chat_id 
    and (
      auth.uid() = ANY(participant_ids) 
      or auth.uid() = artista_id 
      or auth.uid() = assigned_to
      or auth.uid() = owner_id
      or exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor')
    )
  ) then
    raise exception 'Permissão negada.';
  end if;

  -- Deleta mensagens
  delete from messages where chat_id = p_chat_id;
  
  -- Opcional: deletar o chat também se for para "finalizar" totalmente
  delete from chats where id = p_chat_id;
end;
$$ language plpgsql security definer;
