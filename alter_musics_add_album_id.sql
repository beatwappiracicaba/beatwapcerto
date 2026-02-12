ALTER TABLE musics ADD COLUMN IF NOT EXISTS album_id uuid;
ALTER TABLE musics ADD COLUMN IF NOT EXISTS album_title text;
