-- Enable Storage
insert into storage.buckets (id, name, public) values ('tracks', 'tracks', true);
insert into storage.buckets (id, name, public) values ('covers', 'covers', true);

-- Policies for 'tracks' bucket
-- Allow public access to read tracks (or restrict to authenticated users if preferred)
create policy "Public Access to Tracks"
  on storage.objects for select
  using ( bucket_id = 'tracks' );

-- Allow authenticated users to upload tracks
create policy "Authenticated Users can Upload Tracks"
  on storage.objects for insert
  with check ( bucket_id = 'tracks' and auth.role() = 'authenticated' );

-- Allow users to update their own tracks
create policy "Users can Update Own Tracks"
  on storage.objects for update
  using ( bucket_id = 'tracks' and auth.uid() = owner );

-- Allow users to delete their own tracks
create policy "Users can Delete Own Tracks"
  on storage.objects for delete
  using ( bucket_id = 'tracks' and auth.uid() = owner );


-- Policies for 'covers' bucket
-- Allow public access to read covers
create policy "Public Access to Covers"
  on storage.objects for select
  using ( bucket_id = 'covers' );

-- Allow authenticated users to upload covers
create policy "Authenticated Users can Upload Covers"
  on storage.objects for insert
  with check ( bucket_id = 'covers' and auth.role() = 'authenticated' );

-- Allow users to update their own covers
create policy "Users can Update Own Covers"
  on storage.objects for update
  using ( bucket_id = 'covers' and auth.uid() = owner );

-- Allow users to delete their own covers
create policy "Users can Delete Own Covers"
  on storage.objects for delete
  using ( bucket_id = 'covers' and auth.uid() = owner );
