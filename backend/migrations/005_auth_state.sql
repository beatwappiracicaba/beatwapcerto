CREATE TABLE IF NOT EXISTS public.auth_state (
  id int PRIMARY KEY,
  revoked_before timestamptz NOT NULL
);

INSERT INTO public.auth_state (id, revoked_before)
VALUES (1, to_timestamp(0))
ON CONFLICT (id) DO NOTHING;
