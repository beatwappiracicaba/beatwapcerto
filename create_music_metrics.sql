
create table if not exists music_external_metrics (
  id uuid default uuid_generate_v4() primary key,
  music_id uuid references musics(id) on delete cascade,
  plays bigint default 0,
  listeners bigint default 0,
  revenue decimal(10,2) default 0,
  source varchar(50) default 'manual',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(music_id, source)
);

-- Policy to allow authenticated users to read metrics (since artists need to see them)
create policy "Enable read access for all authenticated users"
  on music_external_metrics for select
  using (auth.role() = 'authenticated');

-- Policy to allow producers/admins to insert/update metrics
create policy "Enable insert for producers/admins"
  on music_external_metrics for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and (cargo = 'Produtor' or cargo = 'Admin')
    )
  );

create policy "Enable update for producers/admins"
  on music_external_metrics for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and (cargo = 'Produtor' or cargo = 'Admin')
    )
  );
