-- Adicionar colunas para suporte a feats, compositores e produtores por música
ALTER TABLE musics ADD COLUMN IF NOT EXISTS has_feat boolean DEFAULT false;
ALTER TABLE musics ADD COLUMN IF NOT EXISTS feat_name text;
ALTER TABLE musics ADD COLUMN IF NOT EXISTS composer text;
ALTER TABLE musics ADD COLUMN IF NOT EXISTS producer text;
ALTER TABLE musics ADD COLUMN IF NOT EXISTS isrc text; -- Já existe no código, garantindo no banco
