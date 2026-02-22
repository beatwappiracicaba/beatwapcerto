// Queries para a tabela profiles (compositores)
export const getAllComposersQuery = `
  SELECT * FROM public.profiles WHERE cargo = 'Compositor';
`;

export const createComposersTableQuery = `
  CREATE TABLE IF NOT EXISTS composers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;
