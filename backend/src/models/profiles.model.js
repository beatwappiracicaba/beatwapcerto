export async function listProfiles(pool) {
  const { rows } = await pool.query(
    `SELECT
      id,
      nome,
      email,
      cargo,
      avatar_url,
      bio,
      created_at
     FROM public.profiles
     ORDER BY created_at DESC
     LIMIT 100`
  );
  return rows;
}

export async function getProfileByEmail(pool, email) {
  const { rows } = await pool.query(
    `SELECT
      id,
      nome,
      email,
      cargo,
      avatar_url,
      password_hash
     FROM public.profiles
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

