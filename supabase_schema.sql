create extension if not exists pgcrypto;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  cargo text not null default 'Artista',
  avatar_url text,
  created_at timestamptz default now(),
  check (cargo in ('Artista','Produtor','Vendedor'))
);
create table public.musics (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references public.profiles(id) on delete cascade,
  titulo text,
  status text default 'pendente',
  motivo_recusa text,
  created_at timestamptz default now(),
  check (status in ('pendente','aprovado','recusado'))
);
create table public.artist_metrics (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references public.profiles(id) on delete cascade,
  total_plays integer default 0,
  ouvintes_mensais integer default 0,
  receita_estimada numeric default 0
);
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  sender_cargo text,
  message text,
  created_at timestamptz default now(),
  check (sender_cargo in ('Artista','Produtor','Vendedor'))
);
alter table public.profiles enable row level security;
alter table public.musics enable row level security;
alter table public.artist_metrics enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid());
create policy profiles_select_produtor on public.profiles for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy profiles_update_produtor on public.profiles for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy musics_select_own on public.musics for select using (artista_id = auth.uid());
create policy musics_insert_self on public.musics for insert with check (artista_id = auth.uid());
create policy musics_update_self on public.musics for update using (artista_id = auth.uid());
create policy musics_select_produtor on public.musics for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy musics_update_produtor on public.musics for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy artist_metrics_select_own on public.artist_metrics for select using (artista_id = auth.uid());
create policy artist_metrics_select_produtor on public.artist_metrics for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy artist_metrics_update_produtor on public.artist_metrics for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy chats_select_own on public.chats for select using (artista_id = auth.uid());
create policy chats_insert_self on public.chats for insert with check (artista_id = auth.uid());
create policy chats_select_produtor on public.chats for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy chats_select_vendedor on public.chats for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Vendedor'));
create policy messages_select_artista on public.messages for select using (exists (select 1 from public.chats c where c.id = messages.chat_id and c.artista_id = auth.uid()));
create policy messages_insert_artista on public.messages for insert with check (exists (select 1 from public.chats c where c.id = messages.chat_id and c.artista_id = auth.uid()) and sender_cargo = 'Artista');
create policy messages_select_produtor on public.messages for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor'));
create policy messages_insert_produtor on public.messages for insert to authenticated with check ((exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Produtor')) and sender_cargo = 'Produtor');
create policy messages_select_vendedor on public.messages for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Vendedor'));
create policy messages_insert_vendedor on public.messages for insert to authenticated with check ((exists (select 1 from public.profiles p where p.id = auth.uid() and p.cargo = 'Vendedor')) and sender_cargo = 'Vendedor');
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into profiles (id, nome, cargo, avatar_url) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'Artista', null) on conflict (id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into profiles (id, nome, cargo) select u.id, 'Artista Demo', 'Artista' from auth.users u where u.email ilike '%artist_demo%' limit 1;
insert into profiles (id, nome, cargo) select u.id, 'Produtor Demo', 'Produtor' from auth.users u where u.email ilike '%produtor_demo%' limit 1;
insert into profiles (id, nome, cargo) select u.id, 'Vendedor Demo', 'Vendedor' from auth.users u where u.email ilike '%vendedor_demo%' limit 1;
insert into artist_metrics (id, artista_id, total_plays, ouvintes_mensais, receita_estimada) select gen_random_uuid(), p.id, 1234, 567, 890.12 from profiles p where p.cargo = 'Artista' limit 1;
insert into musics (id, artista_id, titulo, status, motivo_recusa, created_at) select gen_random_uuid(), p.id, 'Faixa Demo', 'pendente', null, now() from profiles p where p.cargo = 'Artista' limit 1;
insert into chats (id, artista_id, created_at) select gen_random_uuid(), p.id, now() from profiles p where p.cargo = 'Artista' limit 1;
insert into messages (id, chat_id, sender_cargo, message, created_at) select gen_random_uuid(), c.id, 'Artista', 'Olá, este é o chat do artista.', now() from chats c limit 1;
insert into messages (id, chat_id, sender_cargo, message, created_at) select gen_random_uuid(), c.id, 'Produtor', 'Mensagem do produtor.', now() from chats c limit 1;
insert into messages (id, chat_id, sender_cargo, message, created_at) select gen_random_uuid(), c.id, 'Vendedor', 'Mensagem do vendedor.', now() from chats c limit 1;
