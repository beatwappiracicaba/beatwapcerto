drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_produtor() cascade;
delete from storage.objects where bucket_id in ('music_covers','music_files','music_docs','avatars');
delete from storage.buckets where id in ('music_covers','music_files','music_docs','avatars');
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.artist_metrics cascade;
drop table if exists public.musics cascade;
drop table if exists public.notifications cascade;
drop table if exists public.online_status cascade;
drop table if exists public.profiles cascade;
create extension if not exists pgcrypto;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  cargo text not null default 'Artista',
  avatar_url text,
  nome_completo_razao_social text,
  cpf_cnpj text,
  celular text,
  cep text,
  logradouro text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  plano text default 'Gratuito',
  tema text default 'dark',
  genero_musical text,
  created_at timestamptz default now(),
  check (cargo in ('Artista','Produtor','Vendedor'))
);
create table public.musics (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references public.profiles(id) on delete cascade,
  titulo text,
  nome_artista text,
  cover_url text,
  audio_url text,
  preview_url text,
  isrc text,
  authorization_url text,
  plataformas text[],
  estilo text,
  upc text,
  presave_link text,
  release_date date,
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
  created_at timestamptz default now(),
  updated_at timestamptz
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  sender_cargo text,
  message text,
  created_at timestamptz default now(),
  check (sender_cargo in ('Artista','Produtor','Vendedor'))
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  title text,
  message text,
  type text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
create table if not exists public.online_status (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  online boolean default false,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.musics enable row level security;
alter table public.artist_metrics enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.online_status enable row level security;
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid());
-- leitura pública de perfis para páginas abertas
create policy profiles_select_public on public.profiles for select to anon using (true);
create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
create policy musics_select_own on public.musics for select using (artista_id = auth.uid());
create policy musics_insert_self on public.musics for insert with check (artista_id = auth.uid());
create policy musics_update_self on public.musics for update using (artista_id = auth.uid());
-- leitura pública de músicas aprovadas para landing
create policy musics_select_public on public.musics for select to anon using (status = 'aprovado');
create policy musics_select_authenticated on public.musics for select to authenticated using (status = 'aprovado');
create policy artist_metrics_select_own on public.artist_metrics for select using (artista_id = auth.uid());
create policy chats_select_own on public.chats for select using (artista_id = auth.uid());
create policy chats_insert_self on public.chats for insert with check (artista_id = auth.uid());
create policy messages_select_artista on public.messages for select using (exists (select 1 from public.chats c where c.id = messages.chat_id and c.artista_id = auth.uid()));
create policy messages_insert_artista on public.messages for insert with check ((exists (select 1 from public.chats c where c.id = messages.chat_id and c.artista_id = auth.uid())) and sender_cargo = 'Artista');
create policy notifications_select_self on public.notifications for select using (recipient_id = auth.uid());
create policy notifications_insert_self on public.notifications for insert with check (recipient_id = auth.uid());
create policy notifications_update_self on public.notifications for update using (recipient_id = auth.uid());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into profiles (id, nome, cargo, avatar_url) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'Artista', null) on conflict (id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
 
create or replace function public.is_produtor() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.cargo = 'Produtor'
  );
$$;
 
drop policy if exists profiles_select_produtor on public.profiles;
create policy profiles_select_produtor on public.profiles for select using (public.is_produtor());

drop policy if exists musics_select_produtor on public.musics;
drop policy if exists musics_update_produtor on public.musics;
create policy musics_select_produtor on public.musics for select using (public.is_produtor());
create policy musics_update_produtor on public.musics for update using (public.is_produtor());

drop policy if exists artist_metrics_select_produtor on public.artist_metrics;
drop policy if exists artist_metrics_insert_produtor on public.artist_metrics;
drop policy if exists artist_metrics_update_produtor on public.artist_metrics;
create policy artist_metrics_select_produtor on public.artist_metrics for select using (public.is_produtor());
create policy artist_metrics_insert_produtor on public.artist_metrics for insert with check (public.is_produtor());
create policy artist_metrics_update_produtor on public.artist_metrics for update using (public.is_produtor());

drop policy if exists notifications_insert_produtor on public.notifications;
create policy notifications_insert_produtor on public.notifications for insert with check (public.is_produtor());
 
drop policy if exists online_status_select_all on public.online_status;
drop policy if exists online_status_upsert_self on public.online_status;
drop policy if exists online_status_update_self on public.online_status;
create policy online_status_select_all on public.online_status for select using (auth.role() = 'authenticated');
create policy online_status_upsert_self on public.online_status for insert with check (profile_id = auth.uid());
create policy online_status_update_self on public.online_status for update using (profile_id = auth.uid());
 
insert into storage.buckets (id, name, public)
values 
  ('music_covers', 'music_covers', true),
  ('music_files', 'music_files', true),
  ('music_docs', 'music_docs', true)
on conflict (id) do nothing;
 
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
 
drop policy if exists "Public Access Covers" on storage.objects;
drop policy if exists "Public Access Music Files" on storage.objects;
drop policy if exists "Public Access Docs" on storage.objects;
drop policy if exists "Public Read Avatars" on storage.objects;
drop policy if exists "Authenticated Upload Covers" on storage.objects;
drop policy if exists "Authenticated Upload Music" on storage.objects;
drop policy if exists "Authenticated Upload Docs" on storage.objects;
drop policy if exists "Authenticated Upload Avatars" on storage.objects;

create policy "Public Access Covers" on storage.objects for select using (bucket_id = 'music_covers');
create policy "Public Access Music Files" on storage.objects for select using (bucket_id = 'music_files');
create policy "Public Access Docs" on storage.objects for select using (bucket_id = 'music_docs');
create policy "Public Read Avatars" on storage.objects for select using (bucket_id = 'avatars');

create policy "Authenticated Upload Covers" on storage.objects for insert with check (bucket_id = 'music_covers' and auth.role() = 'authenticated');
create policy "Authenticated Upload Music" on storage.objects for insert with check (bucket_id = 'music_files' and auth.role() = 'authenticated');
create policy "Authenticated Upload Docs" on storage.objects for insert with check (bucket_id = 'music_docs' and auth.role() = 'authenticated');
create policy "Authenticated Upload Avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
 
do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'chats'
  ) then
    alter publication supabase_realtime add table public.chats;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'online_status'
  ) then
    alter publication supabase_realtime add table public.online_status;
  end if;
end
$$;
