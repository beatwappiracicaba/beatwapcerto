-- Fix handle_new_user trigger to respect metadata role/cargo
-- This ensures that when a user registers with a specific role (e.g. via Invite Link),
-- the profile is created with that role instead of defaulting to 'Artista'.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$ 
BEGIN 
  INSERT INTO profiles (id, nome, cargo, avatar_url, access_control) 
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 
    COALESCE(new.raw_user_meta_data->>'cargo', new.raw_user_meta_data->>'role', 'Artista'), 
    NULL,
    COALESCE((new.raw_user_meta_data->>'access_control')::jsonb, '{}'::jsonb)
  ) 
  ON CONFLICT (id) DO UPDATE SET
    cargo = EXCLUDED.cargo,
    nome = EXCLUDED.nome,
    access_control = EXCLUDED.access_control;
  RETURN new; 
END; 
$$;
