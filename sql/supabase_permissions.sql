-- Add access_control column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_control JSONB DEFAULT '{"musics": true, "work": true, "marketing": true, "chat": true}'::jsonb;

-- Update existing profiles to have default permissions if null
UPDATE public.profiles 
SET access_control = '{"musics": true, "work": true, "marketing": true, "chat": true}'::jsonb 
WHERE access_control IS NULL AND cargo = 'Artista';
