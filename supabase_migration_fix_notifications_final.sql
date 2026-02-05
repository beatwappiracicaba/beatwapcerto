-- Script definitivo para corrigir permissões de notificações (Erro 403)

-- 1. Remover políticas antigas/conflitantes
drop policy if exists "notifications_insert_authenticated" on public.notifications;
drop policy if exists "notifications_insert_produtor" on public.notifications;
drop policy if exists "notifications_insert_self" on public.notifications;
drop policy if exists "notifications_select_self" on public.notifications;
drop policy if exists "notifications_update_self" on public.notifications;

-- 2. Permitir que QUALQUER usuário logado crie notificações (necessário para o sistema funcionar entre Artista/Produtor)
create policy "notifications_insert_any_authenticated" 
on public.notifications 
for insert 
to authenticated 
with check (true);

-- 3. Permitir que usuários vejam apenas suas próprias notificações
create policy "notifications_select_own" 
on public.notifications 
for select 
to authenticated 
using (recipient_id = auth.uid());

-- 4. Permitir que usuários marquem como lida apenas suas próprias notificações
create policy "notifications_update_own" 
on public.notifications 
for update 
to authenticated 
using (recipient_id = auth.uid());
