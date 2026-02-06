
-- Tabela para posts do perfil (Momentos/Galeria)
CREATE TABLE IF NOT EXISTS profile_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
  caption TEXT,
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE profile_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public items are viewable by everyone" 
ON profile_posts FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own items" 
ON profile_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" 
ON profile_posts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" 
ON profile_posts FOR DELETE 
USING (auth.uid() = user_id);

-- Storage Bucket para Posts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage (ajustar conforme necessidade, assumindo public read)
CREATE POLICY "Public Access Posts" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'posts');

CREATE POLICY "Authenticated Upload Posts" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

CREATE POLICY "Owner Delete Posts" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'posts' AND auth.uid() = owner);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_profile_posts_user_id ON profile_posts(user_id);
