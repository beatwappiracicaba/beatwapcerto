
-- 1. Create avatars bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Add policies for 'avatars' bucket (drop existing to avoid conflicts if re-running)
drop policy if exists "Public Access to Avatars" on storage.objects;
drop policy if exists "Authenticated Users can Upload Avatars" on storage.objects;
drop policy if exists "Users can Update Own Avatars" on storage.objects;
drop policy if exists "Users can Delete Own Avatars" on storage.objects;

create policy "Public Access to Avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Authenticated Users can Upload Avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Users can Update Own Avatars"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner );

create policy "Users can Delete Own Avatars"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.uid() = owner );

-- 3. Add bio column to profiles table
alter table public.profiles 
add column if not exists bio text;
