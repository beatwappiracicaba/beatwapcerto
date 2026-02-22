// Queries para login (usando profiles)
export const getUserByEmailQuery = `
  SELECT * FROM public.profiles WHERE email = $1;
`;
