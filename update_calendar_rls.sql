-- Update RLS policies for artist_work_events to allow Vendedor access
-- This allows Sellers to view and manage artist calendars

ALTER TABLE public.artist_work_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS artist_work_events_select ON public.artist_work_events;
DROP POLICY IF EXISTS artist_work_events_insert ON public.artist_work_events;
DROP POLICY IF EXISTS artist_work_events_update ON public.artist_work_events;
DROP POLICY IF EXISTS artist_work_events_delete ON public.artist_work_events;

CREATE POLICY artist_work_events_select ON public.artist_work_events 
FOR SELECT TO authenticated 
USING (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);

CREATE POLICY artist_work_events_insert ON public.artist_work_events 
FOR INSERT 
WITH CHECK (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);

CREATE POLICY artist_work_events_update ON public.artist_work_events 
FOR UPDATE 
USING (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);

CREATE POLICY artist_work_events_delete ON public.artist_work_events 
FOR DELETE 
USING (
  artista_id = auth.uid() OR 
  public.is_produtor() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND cargo = 'Vendedor')
);
