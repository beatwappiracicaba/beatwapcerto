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
alter table public.profiles enable row level security;
alter table public.musics enable row level security;
alter table public.artist_metrics enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid());
-- leitura pública de perfis para páginas abertas
create policy profiles_select_public on public.profiles for select to anon using (true);
create policy musics_select_own on public.musics for select using (artista_id = auth.uid());
create policy musics_insert_self on public.musics for insert with check (artista_id = auth.uid());
create policy musics_update_self on public.musics for update using (artista_id = auth.uid());
-- leitura pública de músicas aprovadas para landing
create policy musics_select_public on public.musics for select to anon using (status = 'aprovado');
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
