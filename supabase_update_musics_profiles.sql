-- Atualização da tabela musics
alter table public.musics 
add column if not exists nome_artista text,
add column if not exists cover_url text,
add column if not exists audio_url text,
add column if not exists preview_url text,
add column if not exists isrc text,
add column if not exists authorization_url text,
add column if not exists plataformas text[], -- Ex: ['Spotify', 'Apple Music'] ou ['Todas']
add column if not exists estilo text,
add column if not exists upc text,
add column if not exists presave_link text;

-- Atualização da tabela profiles
alter table public.profiles
add column if not exists nome_completo_razao_social text,
add column if not exists cpf_cnpj text,
add column if not exists celular text,
add column if not exists cep text,
add column if not exists logradouro text,
add column if not exists complemento text,
add column if not exists bairro text,
add column if not exists cidade text,
add column if not exists estado text,
add column if not exists plano text default 'Gratuito',
add column if not exists tema text default 'dark', -- 'dark' ou 'light'
add column if not exists instagram_url text,
add column if not exists site_url text;

-- Criação dos buckets de storage (se não existirem)
insert into storage.buckets (id, name, public)
values 
  ('music_covers', 'music_covers', true),
  ('music_files', 'music_files', true),
  ('music_docs', 'music_docs', true)
on conflict (id) do nothing;

-- Bucket para avatares de usuários
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Políticas de storage (exemplo simplificado, ajustar conforme necessidade de segurança)
-- Permitir acesso público para leitura de capas e previews
drop policy if exists "Public Access Covers" on storage.objects;
drop policy if exists "Public Access Music Files" on storage.objects;
drop policy if exists "Public Access Docs" on storage.objects;
drop policy if exists "Public Read Avatars" on storage.objects;
create policy "Public Access Covers" on storage.objects for select using (bucket_id = 'music_covers');
create policy "Public Access Music Files" on storage.objects for select using (bucket_id = 'music_files'); -- Cuidado: arquivos originais podem precisar de proteção
create policy "Public Access Docs" on storage.objects for select using (bucket_id = 'music_docs');
create policy "Public Read Avatars" on storage.objects for select using (bucket_id = 'avatars');

-- Permitir upload para usuários autenticados (artistas)
drop policy if exists "Authenticated Upload Covers" on storage.objects;
drop policy if exists "Authenticated Upload Music" on storage.objects;
drop policy if exists "Authenticated Upload Docs" on storage.objects;
drop policy if exists "Authenticated Upload Avatars" on storage.objects;
create policy "Authenticated Upload Covers" on storage.objects for insert with check (bucket_id = 'music_covers' and auth.role() = 'authenticated');
create policy "Authenticated Upload Music" on storage.objects for insert with check (bucket_id = 'music_files' and auth.role() = 'authenticated');
create policy "Authenticated Upload Docs" on storage.objects for insert with check (bucket_id = 'music_docs' and auth.role() = 'authenticated');
create policy "Authenticated Upload Avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Perfis: permitir leitura por Produtor
alter table public.profiles enable row level security;
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles for select using (
  public.is_produtor()
);
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
-- Permitir que Produtor atualize perfis de artistas
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update
  using (public.is_produtor())
  with check (public.is_produtor());

-- Notificações: tabela, RLS e Realtime
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text,
  type text default 'info',
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
drop policy if exists notifications_select_self on public.notifications;
drop policy if exists notifications_insert_self on public.notifications;
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_select_self on public.notifications for select using (recipient_id = auth.uid());
create policy notifications_insert_self on public.notifications for insert with check (recipient_id = auth.uid());
create policy notifications_update_self on public.notifications for update using (recipient_id = auth.uid());

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

-- Policies for musics to allow producer access
alter table public.musics enable row level security;
drop policy if exists musics_select_admin on public.musics;
drop policy if exists musics_update_admin on public.musics;
create policy musics_select_admin on public.musics for select using (
  public.is_produtor()
);
create policy musics_update_admin on public.musics for update using (
  public.is_produtor()
);
-- Allow authenticated users to read approved releases (paridade com bootstrap)
drop policy if exists musics_select_public_auth on public.musics;
create policy musics_select_public_auth on public.musics for select to authenticated using (status = 'aprovado');

-- Notifications: allow producers to insert for others
drop policy if exists notifications_insert_admin on public.notifications;
create policy notifications_insert_admin on public.notifications for insert with check (
  public.is_produtor()
);

-- Chats and messages policies
alter table public.chats enable row level security;
alter table public.messages enable row level security;
drop policy if exists chats_select_access on public.chats;
drop policy if exists chats_insert_artist on public.chats;
create policy chats_select_access on public.chats for select using (
  artista_id = auth.uid() or public.is_produtor()
);
create policy chats_insert_artist on public.chats for insert with check (
  artista_id = auth.uid()
);
drop policy if exists messages_select_access on public.messages;
drop policy if exists messages_insert_access on public.messages;
create policy messages_select_access on public.messages for select using (
  exists (
    select 1 from public.chats c
    where c.id = chat_id
      and (c.artista_id = auth.uid() or public.is_produtor())
  )
);
create policy messages_insert_access on public.messages for insert with check (
  exists (
    select 1 from public.chats c
    where c.id = chat_id
      and (c.artista_id = auth.uid() or public.is_produtor())
  )
);

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
-- Presença online: tabela, RLS e Realtime
create table if not exists public.online_status (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  online boolean default false,
  updated_at timestamptz default now()
);

alter table public.online_status enable row level security;
drop policy if exists online_status_select_all on public.online_status;
drop policy if exists online_status_upsert_self on public.online_status;
drop policy if exists online_status_update_self on public.online_status;
create policy online_status_select_all on public.online_status for select using (auth.role() = 'authenticated');
create policy online_status_upsert_self on public.online_status for insert with check (profile_id = auth.uid());
create policy online_status_update_self on public.online_status for update using (profile_id = auth.uid());

-- Métricas do artista: permitir leitura e upsert por Produtor
alter table public.artist_metrics enable row level security;
drop policy if exists artist_metrics_select_admin on public.artist_metrics;
drop policy if exists artist_metrics_upsert_admin on public.artist_metrics;
drop policy if exists artist_metrics_update_admin on public.artist_metrics;
create policy artist_metrics_select_admin on public.artist_metrics for select using (
  public.is_produtor()
);
create policy artist_metrics_upsert_admin on public.artist_metrics for insert with check (
  public.is_produtor()
);
create policy artist_metrics_update_admin on public.artist_metrics for update using (
  public.is_produtor()
);
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

-- Projetos do Produtor: tabela e políticas
create table if not exists public.producer_projects (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  platform text, -- Ex.: 'YouTube', 'Spotify', 'Instagram', 'Site'
  url text not null,
  published boolean default true,
  created_at timestamptz default now()
);

alter table public.producer_projects enable row level security;
drop policy if exists producer_projects_select_public on public.producer_projects;
drop policy if exists producer_projects_select_admin on public.producer_projects;
drop policy if exists producer_projects_insert_admin on public.producer_projects;
drop policy if exists producer_projects_update_admin on public.producer_projects;
drop policy if exists producer_projects_delete_admin on public.producer_projects;

-- Leitura pública de projetos publicados
create policy producer_projects_select_public on public.producer_projects for select to anon using (published = true);
create policy producer_projects_select_admin on public.producer_projects for select to authenticated using (published = true or public.is_produtor());

-- CRUD permitido ao Produtor
create policy producer_projects_insert_admin on public.producer_projects for insert with check (public.is_produtor());
create policy producer_projects_update_admin on public.producer_projects for update using (public.is_produtor());
create policy producer_projects_delete_admin on public.producer_projects for delete using (public.is_produtor());

-- Realtime
do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'producer_projects'
  ) then
    alter publication supabase_realtime add table public.producer_projects;
  end if;
end
$$;
