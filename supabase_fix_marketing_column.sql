-- Add mentorship_content column to artist_marketing table
ALTER TABLE public.artist_marketing 
ADD COLUMN IF NOT EXISTS mentorship_content JSONB DEFAULT '[]'::jsonb;

-- Ensure RLS policies allow update (usually they do for existing tables, but good to double check if needed, though adding a column doesn't change RLS usually)
