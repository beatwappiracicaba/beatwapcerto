// Queries para a tabela musics (lançamentos)
export const getAllReleasesQuery = `
  SELECT * FROM public.musics WHERE status = 'aprovado';
`;

export const createReleasesTableQuery = `
  CREATE TABLE IF NOT EXISTS releases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER,
    release_date DATE,
    type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(id)
  );
`;
