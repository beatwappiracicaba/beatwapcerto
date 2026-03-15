CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.marketing_data (
  artist_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.music_external_metrics (
  music_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  plays integer NOT NULL DEFAULT 0,
  listeners integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (music_id, source)
);

CREATE TABLE IF NOT EXISTS public.artist_work_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  type text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_work_events_artist_date_idx
  ON public.artist_work_events (artist_id, date ASC);

CREATE TABLE IF NOT EXISTS public.artist_work_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_work_todos_artist_due_idx
  ON public.artist_work_todos (artist_id, due_date ASC);

CREATE TABLE IF NOT EXISTS public.seller_artist_cache (
  artist_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cache_medio text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
aA