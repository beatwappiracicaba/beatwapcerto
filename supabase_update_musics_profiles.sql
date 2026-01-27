-- Atualização da tabela musics
alter table public.musics 
add column if not exists nome_artista text,
add column if not exists cover_url text,
add column if not exists audio_url text,
add column if not exists preview_url text,
add column if not exists isrc text,
add column if not exists authorization_url text,
add column if not exists plataformas text[], -- Ex: ['Spotify', 'Apple Music'] ou ['Todas']
add column if not exists estilo text;

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
add column if not exists tema text default 'dark'; -- 'dark' ou 'light'

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
