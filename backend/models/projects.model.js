// Queries para a tabela producer_projects (projetos)
export const getAllProjectsQuery = `
  SELECT * FROM public.producer_projects WHERE published = true;
`;

export const createProjectsTableQuery = `
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;
