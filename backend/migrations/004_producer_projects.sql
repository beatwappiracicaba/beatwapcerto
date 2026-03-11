CREATE TABLE IF NOT EXISTS public.producer_projects (
  id uuid PRIMARY KEY,
  producer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  platform text NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS producer_projects_published_created_at_idx
  ON public.producer_projects (published, created_at DESC);

CREATE INDEX IF NOT EXISTS producer_projects_producer_created_at_idx
  ON public.producer_projects (producer_id, created_at DESC);

