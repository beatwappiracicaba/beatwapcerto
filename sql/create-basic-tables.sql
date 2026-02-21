-- Criar tabela de eventos (se não existir)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.profiles(id),
  event_name VARCHAR(255) NOT NULL,
  event_date TIMESTAMPTZ,
  venue VARCHAR(255),
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de sponsors (se não existir)
CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  contact VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de compositions (se não existir)
CREATE TABLE IF NOT EXISTS public.compositions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist_id UUID REFERENCES public.profiles(id),
  duration INTEGER,
  genre VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados de teste
INSERT INTO public.events (artist_id, event_name, event_date, venue, revenue) VALUES
  ((SELECT id FROM public.profiles WHERE cargo = 'Artista' LIMIT 1), 'Show Teste', NOW(), 'Auditório Principal', 5000.00);

INSERT INTO public.sponsors (name, type, contact) VALUES
  ('Patrocinador Teste', 'Empresa', 'contato@teste.com');

INSERT INTO public.compositions (title, artist_id, duration, genre) VALUES
  ('Composição Teste 1', (SELECT id FROM public.profiles WHERE cargo = 'Artista' LIMIT 1), 180, 'Rock');