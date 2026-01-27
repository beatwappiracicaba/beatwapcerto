update public.profiles set role = 'produtor' where role = 'admin';
update public.profiles set role = 'artista' where role = 'artist';
update public.profiles set role = 'vendedor' where role = 'seller';

create index if not exists profiles_role_idx on public.profiles (role);

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'produtor'));

drop policy if exists "Admins can update all musics" on public.musics;
create policy "Admins can update all musics" on public.musics for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'produtor'));
drop policy if exists "Admins can delete musics" on public.musics;
create policy "Admins can delete musics" on public.musics for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'produtor'));

do $$
begin
  if to_regclass('public.chats') is not null then
    execute 'drop policy if exists "Users can view their own chats" on public.chats';
    execute 'create policy "Users can view their own chats" on public.chats for select using (auth.uid() = artist_id or exists (select 1 from public.profiles where id = auth.uid() and role = ''produtor''))';
  end if;

  if to_regclass('public.messages') is not null then
    execute 'drop policy if exists "Users can view messages in their chats" on public.messages';
    execute 'create policy "Users can view messages in their chats" on public.messages for select using (exists (select 1 from public.chats where id = chat_id and (artist_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = ''produtor''))))';
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    'artista', 
    'pending'
  );
  
  insert into public.metrics (artist_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;
