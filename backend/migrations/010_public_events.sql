CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.public_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  flyer_url text NOT NULL,
  ticket_price_cents integer NULL,
  purchase_contact text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_events_artist_date_idx ON public.public_events (artist_id, event_date ASC);
CREATE INDEX IF NOT EXISTS public_events_date_idx ON public.public_events (event_date ASC);
