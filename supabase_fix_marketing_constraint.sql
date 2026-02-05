-- Fix missing unique constraint on artist_marketing(artist_id)
-- This is required for UPSERT to work with onConflict: 'artist_id'

-- 1. Check if constraint exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint 
        WHERE conname = 'artist_marketing_artist_id_key'
    ) THEN
        -- Add unique constraint if it doesn't exist
        -- First, ensure there are no duplicates (keep latest)
        DELETE FROM public.artist_marketing a
        USING public.artist_marketing b
        WHERE a.id < b.id AND a.artist_id = b.artist_id;

        ALTER TABLE public.artist_marketing 
        ADD CONSTRAINT artist_marketing_artist_id_key UNIQUE (artist_id);
    END IF;
END $$;

-- 2. Ensure RLS policies are correct
ALTER TABLE public.artist_marketing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them ensuring correctness
DROP POLICY IF EXISTS "Producers/Admins can insert/update marketing data" ON public.artist_marketing;
DROP POLICY IF EXISTS "Producers/Admins can view all marketing data" ON public.artist_marketing;
DROP POLICY IF EXISTS "Artists can view their own marketing data" ON public.artist_marketing;

-- Recreate policies
CREATE POLICY "Artists can view their own marketing data" 
ON public.artist_marketing FOR SELECT 
USING (auth.uid() = artist_id);

CREATE POLICY "Producers/Admins can view all marketing data" 
ON public.artist_marketing FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo IN ('Produtor', 'Admin', 'Superadmin')
  )
);

CREATE POLICY "Producers/Admins can insert/update marketing data" 
ON public.artist_marketing FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo IN ('Produtor', 'Admin', 'Superadmin')
  )
);
