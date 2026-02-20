-- Fix for Artist Marketing Table (Missing Column and Constraint)

-- 1. Add mentorship_content column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'artist_marketing'
        AND column_name = 'mentorship_content'
    ) THEN
        ALTER TABLE public.artist_marketing 
        ADD COLUMN mentorship_content JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Ensure Unique Constraint on artist_id (Required for Upsert)
DO $$
BEGIN
    -- Check if a unique constraint already exists on artist_id
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint 
        WHERE conname = 'artist_marketing_artist_id_key'
    ) THEN
        -- Remove duplicates before adding constraint (keeping the latest one)
        DELETE FROM public.artist_marketing a
        USING public.artist_marketing b
        WHERE a.id < b.id AND a.artist_id = b.artist_id;

        -- Add the unique constraint
        ALTER TABLE public.artist_marketing 
        ADD CONSTRAINT artist_marketing_artist_id_key UNIQUE (artist_id);
    END IF;
END $$;

-- 3. Verify and Fix RLS Policies (Optional but recommended)
ALTER TABLE public.artist_marketing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate (safe to re-run)
DROP POLICY IF EXISTS "Producers/Admins can insert/update marketing data" ON public.artist_marketing;
DROP POLICY IF EXISTS "Producers/Admins can view all marketing data" ON public.artist_marketing;
DROP POLICY IF EXISTS "Artists can view their own marketing data" ON public.artist_marketing;

-- Recreate Policies
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

-- 4. Grant permissions just in case
GRANT ALL ON public.artist_marketing TO authenticated;
GRANT ALL ON public.artist_marketing TO service_role;
