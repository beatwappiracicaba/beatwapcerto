export async function listProfiles(pool, { cargo = null, limit = 100 } = {}) {
  const normalizedCargo = cargo ? String(cargo).trim() : '';
  const lim = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(500, Number(limit))) : 100;

  const values = [];
  let whereSql = '';

  if (normalizedCargo) {
    values.push(normalizedCargo);
    whereSql = `WHERE cargo = $${values.length}`;
  }

  values.push(lim);

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
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values
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

export async function getProfileById(pool, id) {
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
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createProfile(pool, { nome, email, cargo, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO public.profiles (nome, email, cargo, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, email, cargo, avatar_url, bio, created_at`,
    [nome, email, cargo, passwordHash]
  );
  return rows[0] || null;
}
