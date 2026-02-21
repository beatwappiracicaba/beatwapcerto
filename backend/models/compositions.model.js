// Queries para a tabela compositions
export const getAllCompositionsQuery = `
  SELECT * FROM public.compositions;
`;

export const createCompositionsTableQuery = `
  CREATE TABLE IF NOT EXISTS public.compositions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_id UUID REFERENCES public.profiles(id),
    duration INTEGER,
    genre VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;
