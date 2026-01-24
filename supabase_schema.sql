-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (Artists & Admins)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  role text default 'artist', -- 'admin' or 'artist'
  status text default 'pending', -- 'active', 'blocked', 'pending'
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Metrics (1:1 with profiles)
create table public.metrics (
  id uuid default uuid_generate_v4() primary key,
  artist_id uuid references public.profiles(id) on delete cascade not null,
  plays text default '0',
  listeners text default '0',
  revenue text default 'R$ 0,00',
  growth text default '0%',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Music
create table public.musics (
  id uuid default uuid_generate_v4() primary key,
  artist_id uuid references public.profiles(id) on delete cascade not null,
  artist_name text, -- Denormalized for convenience
  title text not null,
  genre text,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  cover_url text,
  audio_url text,
  isrc text,
  upc text,
  internal_note text,
  rejection_reason text,
  release_date date,
  added_by text default 'artist',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  message text,
  type text, -- 'success', 'info', 'error'
  link text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chats
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  artist_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat Messages
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.metrics enable row level security;
alter table public.musics enable row level security;
alter table public.notifications enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Simple Policies (Adjust as needed for production)
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can update all profiles" on public.profiles for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Musics are viewable by everyone" on public.musics for select using (true);
create policy "Artists can insert own music" on public.musics for insert with check (auth.uid() = artist_id);
create policy "Artists can update own music" on public.musics for update using (auth.uid() = artist_id);
create policy "Admins can update all musics" on public.musics for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete musics" on public.musics for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = recipient_id);
create policy "System/Admins can insert notifications" on public.notifications for insert with check (true); 

-- Chat Policies
create policy "Users can view their own chats" on public.chats for select using (auth.uid() = artist_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Artists can create their own chat" on public.chats for insert with check (auth.uid() = artist_id);
create policy "Users can view messages in their chats" on public.messages for select using (exists (select 1 from public.chats where id = chat_id and (artist_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))));
create policy "Users can send messages to their chats" on public.messages for insert with check (exists (select 1 from public.chats where id = chat_id and (artist_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))));
