-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Support Queue Table
create table if not exists support_queue (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references profiles(id) not null,
  role_needed text not null, -- 'produtor', 'vendedor', 'compositor'
  metadata jsonb default '{}'::jsonb, -- Stores snapshot of user info (city, style)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  active boolean default true
);

-- 2. Update Chats Table for Generalized Participants
alter table chats add column if not exists type text default 'support'; -- 'support', 'direct'
alter table chats add column if not exists participant_ids uuid[] default '{}'; 
alter table chats add column if not exists owner_id uuid references profiles(id); -- Who initiated the chat

-- 3. RLS Policies for Support Queue
alter table support_queue enable row level security;

-- Insert: Anyone can request help
create policy "Users can insert their own requests"
  on support_queue for insert
  with check (auth.uid() = requester_id);

-- Select: Requester can see their own
create policy "Users can view their own requests"
  on support_queue for select
  using (auth.uid() = requester_id);

-- Select: Producers see everything (or just producer requests? User said "ver chats de quem esta precisando de ajuda")
create policy "Producers can view all requests"
  on support_queue for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'Produtor')
  );

-- Select: Sellers see requests for Sellers
create policy "Sellers can view requests for sellers"
  on support_queue for select
  using (
    role_needed = 'vendedor' 
    and exists (select 1 from profiles where id = auth.uid() and role = 'Vendedor')
  );

-- Select: Composers see requests for Composers (or Artists looking for help?)
-- Assuming Composers help Artists who select 'Compositor' (which we will add)
create policy "Composers can view requests for composers"
  on support_queue for select
  using (
    role_needed = 'compositor' 
    and exists (select 1 from profiles where id = auth.uid() and role = 'Compositor')
  );

-- 4. Update RLS for Chats (Generalized)
-- Note: This might conflict with existing policies if not careful. 
-- Best to Add a new policy that ORs with the existing one, or relies on the app logic if RLS is permissive.
-- Ideally:
-- create policy "Participants can view chats"
--   on chats for select
--   using (auth.uid() = any(participant_ids));
