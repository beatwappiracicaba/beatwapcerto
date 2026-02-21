-- Criar tabela de músicas
CREATE TABLE IF NOT EXISTS public.musics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist_id UUID REFERENCES public.profiles(id),
  duration INTEGER,
  genre VARCHAR(100),
  plays INTEGER DEFAULT 0,
  listeners INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de eventos
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.profiles(id),
  event_name VARCHAR(255) NOT NULL,
  event_date TIMESTAMPTZ,
  venue VARCHAR(255),
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de sponsors
CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  contact VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir dados de teste
INSERT INTO public.musics (title, artist_id, duration, genre, plays, listeners, revenue) VALUES
  ('Música Teste 1', (SELECT id FROM public.profiles WHERE cargo = 'Artista' LIMIT 1), 180, 'Rock', 1000, 500, 150.50),
  ('Música Teste 2', (SELECT id FROM public.profiles WHERE cargo = 'Artista' LIMIT 1), 200, 'Pop', 800, 400, 120.00);

INSERT INTO public.events (artist_id, event_name, event_date, venue, revenue) VALUES
  ((SELECT id FROM public.profiles WHERE cargo = 'Artista' LIMIT 1), 'Show Teste', NOW(), 'Auditório Principal', 5000.00);

INSERT INTO public.sponsors (name, type, contact) VALUES
  ('Patrocinador Teste', 'Empresa', 'contato@teste.com');