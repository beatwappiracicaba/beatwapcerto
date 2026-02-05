-- Permitir que qualquer usuário autenticado insira notificações
-- Isso é necessário para que Artistas possam notificar Admins (ex: upload de música)
-- e para que o sistema funcione corretamente quando ações de usuários geram notificações para outros.

drop policy if exists notifications_insert_authenticated on public.notifications;

create policy notifications_insert_authenticated 
on public.notifications 
for insert 
to authenticated 
with check (true);
