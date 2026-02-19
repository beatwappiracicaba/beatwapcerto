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
