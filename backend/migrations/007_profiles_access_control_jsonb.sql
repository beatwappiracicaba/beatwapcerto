DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'access_control'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN access_control TYPE jsonb
      USING (
        CASE
          WHEN access_control IS NULL THEN '{}'::jsonb
          WHEN trim(access_control) = '' THEN '{}'::jsonb
          WHEN access_control ~ '^[[:space:]]*\\{[\\s\\S]*\\}[[:space:]]*$' THEN access_control::jsonb
          ELSE '{}'::jsonb
        END
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'access_control'
      AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN access_control SET DEFAULT '{}'::jsonb;
  END IF;
END $$;
