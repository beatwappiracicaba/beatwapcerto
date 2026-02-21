-- Criação das tabelas principais sem dependências do Supabase Storage

-- Tabela de perfis (usuários)
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  cargo TEXT NOT NULL DEFAULT 'Artista',
  avatar_url TEXT,
  nome_completo_razao_social TEXT,
  cpf_cnpj TEXT,
  celular TEXT,
  cep TEXT,
  logradouro TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  plano TEXT DEFAULT 'Gratuito',
  tema TEXT DEFAULT 'dark',
  genero_musical TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (cargo IN ('Artista', 'Produtor', 'Vendedor', 'Compositor'))
);

-- Tabela de músicas
DROP TABLE IF EXISTS public.musics CASCADE;
CREATE TABLE public.musics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artista_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT,
  nome_artista TEXT,
  cover_url TEXT,
  audio_url TEXT,
  preview_url TEXT,
  isrc TEXT,
  authorization_url TEXT,
  plataformas TEXT[],
  estilo TEXT,
  upc TEXT,
  presave_link TEXT,
  release_date DATE,
  status TEXT DEFAULT 'pendente',
  motivo_recusa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('pendente', 'aprovado', 'recusado'))
);

-- Tabela de projetos do produtor
DROP TABLE IF EXISTS public.producer_projects CASCADE;
CREATE TABLE public.producer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produtor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  preco DECIMAL(10,2),
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de métricas dos artistas
DROP TABLE IF EXISTS public.artist_metrics CASCADE;
CREATE TABLE public.artist_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artista_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_plays INTEGER DEFAULT 0,
  ouvintes_mensais INTEGER DEFAULT 0,
  receita_estimada NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de chats
DROP TABLE IF EXISTS public.chats CASCADE;
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artista_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_cargo TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (sender_cargo IN ('Artista', 'Produtor', 'Vendedor', 'Compositor'))
);

-- Tabela de notificações
DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  type TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de status online
DROP TABLE IF EXISTS public.online_status CASCADE;
CREATE TABLE public.online_status (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  online BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir dados de teste
INSERT INTO public.profiles (nome, cargo, email, password_hash) VALUES
  ('Artista Teste 1', 'Artista', 'artista1@teste.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('Artista Teste 2', 'Artista', 'artista2@teste.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('Produtor Teste', 'Produtor', 'produtor@teste.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('Vendedor Teste', 'Vendedor', 'vendedor@teste.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('Compositor Teste', 'Compositor', 'compositor@teste.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

INSERT INTO public.musics (artista_id, titulo, nome_artista, status) VALUES
  ((SELECT id FROM public.profiles WHERE email = 'artista1@teste.com'), 'Música Teste 1', 'Artista Teste 1', 'aprovado'),
  ((SELECT id FROM public.profiles WHERE email = 'artista1@teste.com'), 'Música Teste 2', 'Artista Teste 1', 'aprovado'),
  ((SELECT id FROM public.profiles WHERE email = 'artista2@teste.com'), 'Música Teste 3', 'Artista Teste 2', 'pendente');

INSERT INTO public.producer_projects (produtor_id, titulo, descricao, preco, published) VALUES
  ((SELECT id FROM public.profiles WHERE email = 'produtor@teste.com'), 'Projeto Teste 1', 'Descrição do projeto teste 1', 500.00, true),
  ((SELECT id FROM public.profiles WHERE email = 'produtor@teste.com'), 'Projeto Teste 2', 'Descrição do projeto teste 2', 750.00, false);

INSERT INTO public.artist_metrics (artista_id, total_plays, ouvintes_mensais, receita_estimada) VALUES
  ((SELECT id FROM public.profiles WHERE email = 'artista1@teste.com'), 15000, 1200, 2500.50),
  ((SELECT id FROM public.profiles WHERE email = 'artista2@teste.com'), 8500, 800, 1800.75);

INSERT INTO public.chats (artista_id, titulo) VALUES
  ((SELECT id FROM public.profiles WHERE email = 'artista1@teste.com'), 'Chat Artista 1'),
  ((SELECT id FROM public.profiles WHERE email = 'artista2@teste.com'), 'Chat Artista 2');

INSERT INTO public.messages (chat_id, sender_id, sender_cargo, message) VALUES
  ((SELECT id FROM public.chats WHERE titulo = 'Chat Artista 1'), (SELECT id FROM public.profiles WHERE email = 'artista1@teste.com'), 'Artista', 'Olá, esta é uma mensagem de teste!'),
  ((SELECT id FROM public.chats WHERE titulo = 'Chat Artista 1'), (SELECT id FROM public.profiles WHERE email = 'produtor@teste.com'), 'Produtor', 'Olá! Como posso ajudar?');

INSERT INTO public.notifications (recipient_id, title, message, type) VALUES
  ((SELECT id FROM public.profiles WHERE email = 'artista1@teste.com'), 'Notificação Teste', 'Sua música foi aprovada!', 'music_approved'),
  ((SELECT id FROM public.profiles WHERE email = 'produtor@teste.com'), 'Novo Projeto', 'Você tem um novo projeto disponível!', 'new_project');

INSERT INTO public.online_status (profile_id, online) VALUES
  ((SELECT id FROM public.profiles WHERE email = 'artista1@teste.com'), true),
  ((SELECT id FROM public.profiles WHERE email = 'artista2@teste.com'), false),
  ((SELECT id FROM public.profiles WHERE email = 'produtor@teste.com'), true);