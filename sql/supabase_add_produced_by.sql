-- Migration to add produced_by column to musics table
-- This allows linking a music track to a specific Producer (profile)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'musics' AND column_name = 'produced_by') THEN
        ALTER TABLE musics ADD COLUMN produced_by UUID REFERENCES profiles(id);
    END IF;
END $$;
