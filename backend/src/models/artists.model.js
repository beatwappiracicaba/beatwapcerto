// Queries para a tabela profiles (todos os artistas)
export const getAllArtistsQuery = `
  SELECT * FROM public.profiles WHERE cargo = 'Artista';
`;

export const createArtistsTableQuery = `
  CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;
