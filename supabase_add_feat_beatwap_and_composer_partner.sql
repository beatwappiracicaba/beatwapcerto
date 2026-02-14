ALTER TABLE musics
ADD COLUMN IF NOT EXISTS feat_beatwap_artist_ids uuid[] DEFAULT ARRAY[]::uuid[];

ALTER TABLE musics
ADD COLUMN IF NOT EXISTS is_beatwap_composer_partner boolean DEFAULT false;
