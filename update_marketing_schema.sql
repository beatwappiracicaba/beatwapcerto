-- Add missing columns to artist_marketing table for Composer features
-- These columns store JSON data for the various sections of the Composer Dashboard

DO $$
BEGIN
    -- composer_diagnosis
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'composer_diagnosis') THEN
        ALTER TABLE artist_marketing ADD COLUMN composer_diagnosis JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- composer_catalog
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'composer_catalog') THEN
        ALTER TABLE artist_marketing ADD COLUMN composer_catalog JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- composer_positioning
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'composer_positioning') THEN
        ALTER TABLE artist_marketing ADD COLUMN composer_positioning JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- composer_pitch
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'composer_pitch') THEN
        ALTER TABLE artist_marketing ADD COLUMN composer_pitch JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- composer_opportunities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'composer_opportunities') THEN
        ALTER TABLE artist_marketing ADD COLUMN composer_opportunities JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- composer_rights
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'composer_rights') THEN
        ALTER TABLE artist_marketing ADD COLUMN composer_rights JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- composer_plan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'composer_plan') THEN
        ALTER TABLE artist_marketing ADD COLUMN composer_plan JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- mentorship_content (if not already present)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_marketing' AND column_name = 'mentorship_content') THEN
        ALTER TABLE artist_marketing ADD COLUMN mentorship_content JSONB DEFAULT '[]'::jsonb;
    END IF;

END $$;
