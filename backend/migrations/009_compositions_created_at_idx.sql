CREATE INDEX IF NOT EXISTS compositions_created_at_idx
  ON public.compositions (created_at DESC);
