alter table leads 
add column if not exists artist_id uuid references profiles(id) on delete set null;
