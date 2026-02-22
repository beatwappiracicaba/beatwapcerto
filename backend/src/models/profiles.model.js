// models/profiles.model.js

/**
 * Query SQL para buscar todos os artistas na tabela 'profiles'.
 * Esta query seleciona todas as colunas da tabela.
 */
export const getAllArtistsQuery = `
  SELECT * FROM public.profiles WHERE cargo = 'Artista';
`;

/**
 * Query SQL para criar a tabela 'artists'.
 * Esta é uma query de exemplo para referência.
 * 
 * Colunas:
 * - id: Chave primária, serial (auto-incremento).
 * - name: Nome do artista (VARCHAR, não nulo).
 * - genre: Gênero musical do artista (VARCHAR).
 * - bio: Biografia do artista (TEXT).
 * - created_at: Data e hora de criação do registro (padrão: agora).
 */
export const createArtistsTableQuery = `
  CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;
