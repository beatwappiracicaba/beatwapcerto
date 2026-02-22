// Queries para a tabela profiles (produtores)
export const getAllProducersQuery = `
  SELECT * FROM public.profiles WHERE cargo = 'Produtor';
`;

export const createProducersTableQuery = `
  CREATE TABLE IF NOT EXISTS producers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;
