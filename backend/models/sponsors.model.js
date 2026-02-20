// Queries para a tabela sponsors
export const getAllSponsorsQuery = `
  SELECT * FROM sponsors;
`;

export const createSponsorsTableQuery = `
  CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;
