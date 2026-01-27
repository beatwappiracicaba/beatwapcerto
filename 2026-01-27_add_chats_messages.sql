create extension if not exists "uuid-ossp";

create table if not exists public.chats (
  id uuid default uuid_generate_v4() primary key,
  artist_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table if exists public.chats enable row level security;
alter table if exists public.messages enable row level security;

drop policy if exists "Users can view their own chats" on public.chats;
create policy "Users can view their own chats"
  on public.chats for select
  using (
    auth.uid() = artist_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'produtor')
  );

drop policy if exists "Artists can create their own chat" on public.chats;
create policy "Artists can create their own chat"
  on public.chats for insert
  with check (auth.uid() = artist_id);

drop policy if exists "Users can view messages in their chats" on public.messages;
create policy "Users can view messages in their chats"
  on public.messages for select
  using (
    exists (
      select 1
      from public.chats
      where id = chat_id
        and (
          artist_id = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'produtor')
        )
    )
  );

drop policy if exists "Users can send messages to their chats" on public.messages;
create policy "Users can send messages to their chats"
  on public.messages for insert
  with check (
    exists (
      select 1
      from public.chats
      where id = chat_id
        and (
          artist_id = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'produtor')
        )
    )
  );
