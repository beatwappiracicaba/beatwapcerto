
-- 1. Create a function that runs on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    'artist', 
    'pending'
  );
  
  -- Create empty metrics for the user
  insert into public.metrics (artist_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
-- This will run automatically every time a new user signs up via Supabase Auth
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
