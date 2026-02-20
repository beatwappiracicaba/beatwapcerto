// Queries para a tabela compositions
export const getAllCompositionsQuery = `
  SELECT * FROM compositions;
`;

export const createCompositionsTableQuery = `
  CREATE TABLE IF NOT EXISTS compositions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER,
    duration INTEGER,
    genre VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(id)
  );
`;
