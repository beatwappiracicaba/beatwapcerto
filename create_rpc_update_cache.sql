CREATE OR REPLACE FUNCTION update_artist_cache(artist_id UUID, new_cache TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is a Vendedor or Produtor
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND cargo IN ('Vendedor', 'Produtor', 'Admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE profiles
  SET cache_medio = new_cache
  WHERE id = artist_id;
END;
$$;
