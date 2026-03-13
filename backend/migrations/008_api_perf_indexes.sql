CREATE INDEX IF NOT EXISTS profiles_cargo_created_at_idx
  ON public.profiles (cargo, created_at);

CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  link_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sponsors_active_created_at_idx
  ON public.sponsors (active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.compositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compositions_composer_created_at_idx
  ON public.compositions (composer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS compositions_status_created_at_idx
  ON public.compositions (status, created_at DESC);
