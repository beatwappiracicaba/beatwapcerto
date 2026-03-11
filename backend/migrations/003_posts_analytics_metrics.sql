CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL,
  caption text,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_user_id_created_at_idx
  ON public.posts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  artist_id uuid,
  music_id uuid,
  duration_seconds integer,
  ip_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_artist_created_at_idx
  ON public.analytics_events (artist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_music_created_at_idx
  ON public.analytics_events (music_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.artist_metrics (
  artist_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_plays integer NOT NULL DEFAULT 0,
  ouvintes_mensais integer NOT NULL DEFAULT 0,
  receita_estimada numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

