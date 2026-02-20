// Queries para a tabela artists (todos os artistas)
export const getAllArtistsQuery = `
  SELECT * FROM artists;
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
