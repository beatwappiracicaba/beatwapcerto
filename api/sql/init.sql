-- Users
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'Artista',
  created_at timestamptz not null default now()
);

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
