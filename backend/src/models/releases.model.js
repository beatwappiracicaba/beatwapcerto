export async function listReleases(pool) {
  const { rows } = await pool.query(
    `SELECT
      id,
      title,
      cover_url,
      created_at
     FROM public.releases
     ORDER BY created_at DESC
     LIMIT 50`
  );
  return rows;
}

