// Queries para login
export const getUserByEmailQuery = `
  SELECT * FROM users WHERE email = $1;
`;
