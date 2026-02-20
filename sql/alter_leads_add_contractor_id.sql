alter table leads 
add column if not exists contractor_id uuid references profiles(id) on delete set null;
