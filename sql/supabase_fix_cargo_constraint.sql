-- Fix for Profiles Cargo Check Constraint
-- This script updates the check constraint on the 'cargo' column in the 'profiles' table
-- to include 'Compositor' as a valid value.

-- 1. Drop the existing constraint
-- We use a DO block to find the constraint name dynamically or try common names
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find constraints on the cargo column of profiles table
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%cargo%'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Add the new constraint with 'Compositor' included
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_cargo_check 
CHECK (cargo IN ('Artista', 'Produtor', 'Vendedor', 'Compositor', 'Admin', 'Superadmin'));

-- 3. Optional: Migrate existing 'Vendedor' to 'Compositor' if desired
-- UPDATE public.profiles SET cargo = 'Compositor' WHERE cargo = 'Vendedor';

-- 4. Verify RLS policies (ensure they cover Compositor)
-- (This part assumes policies rely on cargo column values or helper functions)

-- Update is_produtor function if it exists to be safe (though it likely checks for 'Produtor')
CREATE OR REPLACE FUNCTION public.is_produtor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND cargo IN ('Produtor', 'Admin', 'Superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
