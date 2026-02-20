-- Script Completo para corrigir a tabela artist_marketing
-- Adiciona TODAS as colunas usadas no painel de Marketing (Artista e Compositor)
-- Execute este script no Editor SQL do Supabase

-- 1. Métricas de Redes Sociais (Artistas)
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS instagram_metrics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS tiktok_metrics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS youtube_metrics JSONB DEFAULT '{}'::jsonb;

-- 2. Diagnóstico e Planos (Artistas)
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS diagnosis JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS action_plan JSONB DEFAULT '[]'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS suggestions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS mentorship_content JSONB DEFAULT '[]'::jsonb;

-- 3. Funcionalidades de Compositor
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS composer_diagnosis JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS composer_catalog JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS composer_positioning JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS composer_pitch JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS composer_opportunities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS composer_rights JSONB DEFAULT '{}'::jsonb;
ALTER TABLE artist_marketing ADD COLUMN IF NOT EXISTS composer_plan JSONB DEFAULT '[]'::jsonb;

-- Comentário para confirmar execução
COMMENT ON TABLE artist_marketing IS 'Tabela atualizada com todas as colunas de marketing para Artistas e Compositores';
