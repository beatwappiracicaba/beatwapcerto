-- Adicionar colunas faltantes para corresponder ao que o worker espera

-- Tabela compositions: adicionar coluna descricao
ALTER TABLE public.compositions 
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Tabela sponsors: adicionar coluna logo_url
ALTER TABLE public.sponsors 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Tabela musics: adicionar coluna duracao (se não existir) ou renomear duration
ALTER TABLE public.musics 
ADD COLUMN IF NOT EXISTS duracao INTEGER;

-- Se a coluna duration existir, copiar os valores para duracao
UPDATE public.musics 
SET duracao = duration 
WHERE duracao IS NULL AND duration IS NOT NULL;

-- Adicionar outras colunas que o worker pode estar esperando
ALTER TABLE public.musics 
ADD COLUMN IF NOT EXISTS nome_artista TEXT,
ADD COLUMN IF NOT EXISTS capa_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS isrc TEXT,
ADD COLUMN IF NOT EXISTS authorization_url TEXT,
ADD COLUMN IF NOT EXISTS plataformas TEXT[],
ADD COLUMN IF NOT EXISTS estilo TEXT,
ADD COLUMN IF NOT EXISTS upc TEXT,
ADD COLUMN IF NOT EXISTS presave_link TEXT,
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS motivo_recusa TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Adicionar constraint de status se a coluna existir
ALTER TABLE public.musics 
DROP CONSTRAINT IF EXISTS musics_status_check;
ALTER TABLE public.musics 
ADD CONSTRAINT musics_status_check CHECK (status IN ('pendente', 'aprovado', 'recusado'));

-- Adicionar colunas faltantes em compositions
ALTER TABLE public.compositions 
ADD COLUMN IF NOT EXISTS artista_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS capa_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS letra TEXT,
ADD COLUMN IF NOT EXISTS genero TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Adicionar colunas faltantes em sponsors  
ALTER TABLE public.sponsors 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Inserir alguns dados de teste
INSERT INTO public.compositions (titulo, artista_id, descricao, genero, status) VALUES
  ('Composição Teste 1', (SELECT id FROM public.profiles WHERE cargo = 'Compositor' LIMIT 1), 'Descrição da composição teste 1', 'MPB', 'aprovado'),
  ('Composição Teste 2', (SELECT id FROM public.profiles WHERE cargo = 'Compositor' LIMIT 1), 'Descrição da composição teste 2', 'Rock', 'pendente');

INSERT INTO public.sponsors (name, type, contact, logo_url, website, email) VALUES
  ('Patrocinador 1', 'Empresa', 'contato1@teste.com', 'https://via.placeholder.com/150', 'https://patrocinador1.com', 'contato@patrocinador1.com'),
  ('Patrocinador 2', 'Marca', 'contato2@teste.com', 'https://via.placeholder.com/150', 'https://patrocinador2.com', 'contato@patrocinador2.com');

-- Atualizar musics com dados de teste
UPDATE public.musics 
SET nome_artista = 'Artista Teste', capa_url = 'https://via.placeholder.com/300', audio_url = 'https://example.com/audio.mp3', preview_url = 'https://example.com/preview.mp3', isrc = 'ISRC123', estilo = 'Pop', status = 'aprovado'
WHERE nome_artista IS NULL;