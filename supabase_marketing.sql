-- Create table for artist marketing metrics and plan
CREATE TABLE IF NOT EXISTS public.artist_marketing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  instagram_metrics JSONB DEFAULT '{}'::jsonb, -- { followers, engagement, frequency, interpretation }
  tiktok_metrics JSONB DEFAULT '{}'::jsonb, -- { followers, views_avg, best_content, interpretation }
  youtube_metrics JSONB DEFAULT '{}'::jsonb, -- { subscribers, best_video, frequency_ideal, interpretation }
  diagnosis JSONB DEFAULT '{}'::jsonb, -- { reach, digital_presence, strategy, show_readiness }
  action_plan JSONB DEFAULT '[]'::jsonb, -- Array of { id, text, type: 'orientation'|'mentor', completed }
  suggestions JSONB DEFAULT '[]'::jsonb, -- Array of { text }
  mentorship_content JSONB DEFAULT '[]'::jsonb, -- Array of { title, duration, type }
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.artist_marketing ENABLE ROW LEVEL SECURITY;

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

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_artist_marketing_updated_at
    BEFORE UPDATE ON public.artist_marketing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
