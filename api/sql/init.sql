-- Required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- Users
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'Artista',
  created_at timestamptz not null default now()
);

alter table if exists users add column if not exists nome text;
alter table if exists users add column if not exists password_hash text;
alter table if exists users add column if not exists refresh_token text;
alter table if exists users add column if not exists failed_attempts integer not null default 0;
alter table if exists users add column if not exists locked_until timestamptz;
alter table if exists users add column if not exists last_login timestamptz;
alter table if exists users add column if not exists last_ip text;
alter table if exists users add column if not exists last_user_agent text;
do $$ begin
if not exists (select 1 from pg_indexes where tablename='users' and indexname='users_email_key') then
  begin
    alter table users add constraint users_email_key unique(email);
  exception when others then null;
  end;
end if;
end $$;

-- Artists
create table if not exists artists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references users(id) on delete cascade,
  stage_name text,
  bio text
);

-- Songs
create table if not exists songs (
  id uuid default gen_random_uuid() primary key,
  artist_id uuid not null references users(id) on delete cascade,
  title text not null,
  cover_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

-- Messages
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid not null references users(id) on delete cascade,
  receiver_id uuid not null references users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- AI chat history
create table if not exists ai_chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'user',
  content text not null,
  created_at timestamptz not null default now()
);

-- Profiles (simplified)
create table if not exists profiles (
  id uuid primary key references users(id) on delete cascade,
  nome text,
  nome_completo_razao_social text,
  cargo text,
  bio text,
  avatar_url text,
  genero_musical text,
  instagram_url text,
  youtube_url text,
  spotify_url text,
  deezer_url text,
  tiktok_url text,
  site_url text,
  plano text,
  bonus_quota integer,
  plan_started_at timestamptz,
  access_control jsonb,
  created_at timestamptz not null default now()
);

-- Analytics events (simplified)
create table if not exists analytics_events (
  id uuid default gen_random_uuid() primary key,
  type text,
  ip_hash text,
  music_id uuid,
  artist_id uuid,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

-- Proposals (seller proposals and contracts)
create table if not exists proposals (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid not null references users(id) on delete cascade,
  lead_id uuid,
  client_name text,
  title text,
  artist_id uuid,
  value numeric,
  status text,
  file_url text,
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notifications
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid not null references users(id) on delete cascade,
  title text,
  message text,
  type text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Leads (simplified)
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references users(id) on delete set null,
  contractor_name text,
  event_name text,
  budget numeric,
  status text,
  created_at timestamptz not null default now()
);

-- Commissions (simplified)
create table if not exists commissions (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references users(id) on delete set null,
  lead_id uuid,
  amount numeric,
  status text,
  created_at timestamptz not null default now()
);

-- Producer projects (simplified)
create table if not exists producer_projects (
  id uuid default gen_random_uuid() primary key,
  title text,
  url text,
  platform text,
  created_at timestamptz not null default now()
);

-- Sponsors (simplified)
create table if not exists sponsors (
  id uuid default gen_random_uuid() primary key,
  name text,
  logo_url text,
  instagram_url text,
  site_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Musics (subset of columns used)
create table if not exists musics (
  id uuid default gen_random_uuid() primary key,
  titulo text,
  nome_artista text,
  estilo text,
  cover_url text,
  preview_url text,
  audio_url text,
  presave_link text,
  release_date timestamptz,
  created_at timestamptz not null default now(),
  artista_id uuid references users(id) on delete set null,
  is_beatwap_produced boolean default false,
  show_on_home boolean default false,
  produced_by uuid,
  album_id uuid,
  album_title text,
  status text,
  feat_beatwap_artist_ids uuid[]
);

-- Compositions (subset of columns used)
create table if not exists compositions (
  id uuid default gen_random_uuid() primary key,
  title text,
  genre text,
  cover_url text,
  audio_url text,
  created_at timestamptz not null default now(),
  composer_id uuid references users(id) on delete set null,
  status text
);

-- Artist work events (finance/events)
create table if not exists artist_work_events (
  id uuid default gen_random_uuid() primary key,
  artista_id uuid references users(id) on delete set null,
  seller_id uuid references users(id) on delete set null,
  manager_id uuid references users(id) on delete set null,
  title text,
  date timestamptz,
  type text,
  notes text,
  created_by uuid references users(id) on delete set null,
  status text,
  has_contract boolean not null default false,
  contract_url text,
  revenue numeric,
  artist_share numeric,
  seller_commission numeric,
  house_cut numeric,
  manager_cut numeric,
  receipt_artist text,
  receipt_seller text,
  receipt_house text,
  receipt_manager text,
  created_at timestamptz not null default now()
);
