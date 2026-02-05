
-- Rename role 'Vendedor' to 'Compositor' in profiles
UPDATE public.profiles 
SET cargo = 'Compositor' 
WHERE cargo = 'Vendedor';

-- Create compositions table
CREATE TABLE IF NOT EXISTS public.compositions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  composer_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  genre TEXT,
  description TEXT,
  price DECIMAL(10,2), -- Optional: if they sell compositions
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  admin_feedback TEXT
);

-- Enable RLS
ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;

-- Policies for compositions
CREATE POLICY "Compositions are viewable by everyone if approved" 
ON public.compositions FOR SELECT 
USING (status = 'approved');

CREATE POLICY "Composers can view their own compositions" 
ON public.compositions FOR SELECT 
USING (auth.uid() = composer_id);

CREATE POLICY "Producers can view all compositions" 
ON public.compositions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo = 'Produtor'
  )
);

CREATE POLICY "Composers can insert their own compositions" 
ON public.compositions FOR INSERT 
WITH CHECK (auth.uid() = composer_id);

CREATE POLICY "Composers can update their own compositions" 
ON public.compositions FOR UPDATE 
USING (auth.uid() = composer_id);

CREATE POLICY "Producers can update compositions (approve/reject)" 
ON public.compositions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND cargo = 'Produtor'
  )
);

-- Update admin permissions defaults in existing profiles
UPDATE public.profiles
SET access_control = access_control || '{"admin_compositions": true}'::jsonb
WHERE cargo = 'Produtor';

-- Grant permissions if needed (usually handled by postgres roles, but ensuring public access for select approved)
GRANT SELECT ON public.compositions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.compositions TO authenticated;
