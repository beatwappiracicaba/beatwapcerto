export async function listProfiles(
  pool,
  { cargo = null, limit = 100, includeEmail = false, includeAccessControl = false, includeVerified = false } = {}
) {
  const normalizedCargo = cargo ? String(cargo).trim() : '';
  const lim = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(500, Number(limit))) : 100;
  const withEmail = !!includeEmail;
  const withAccessControl = !!includeAccessControl;
  const withVerified = !!includeVerified;
  const columns = await getProfilesColumns(pool);

  const values = [];
  let whereSql = '';

  if (normalizedCargo) {
    values.push(normalizedCargo);
    whereSql = `WHERE lower(trim(cargo)) = lower(trim($${values.length}))`;
  }

  values.push(lim);

  const selectCols = [
    'id',
    'nome',
    ...(withEmail ? ['email'] : []),
    'cargo',
    'avatar_url',
    'bio',
    'created_at',
  ];
  if (withAccessControl && columns.has('access_control')) selectCols.push('access_control');
  if (withVerified && columns.has('access_control')) {
    selectCols.push(
      `CASE
        WHEN (access_control->>'verified') IN ('true', 'false') THEN (access_control->>'verified')::boolean
        ELSE false
      END AS verified`
    );
  } else if (withVerified) {
    selectCols.push('false AS verified');
  }

  const { rows } = await pool.query(
    `SELECT
      ${selectCols.join(',\n      ')}
     FROM public.profiles
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values
  );
  return rows;
}

let profilesColumnsCache = { at: 0, columns: null };

async function getProfilesColumns(pool) {
  const now = Date.now();
  if (profilesColumnsCache.columns && now - profilesColumnsCache.at < 60_000) {
    return profilesColumnsCache.columns;
  }
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'profiles'`
  );
  const set = new Set(rows.map((r) => String(r.column_name)));
  profilesColumnsCache = { at: now, columns: set };
  return set;
}

function pickColumns(available, desired) {
  return desired.filter((c) => available.has(c));
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
  const columns = await getProfilesColumns(pool);
  const desired = [
    'id',
    'nome',
    'email',
    'cargo',
    'avatar_url',
    'bio',
    'genero_musical',
    'instagram_url',
    'site_url',
    'youtube_url',
    'spotify_url',
    'deezer_url',
    'tiktok_url',
    'tema',
    'plano',
    'bonus_quota',
    'plan_started_at',
    'access_control',
    'nome_completo_razao_social',
    'cpf_cnpj',
    'celular',
    'cep',
    'logradouro',
    'complemento',
    'bairro',
    'cidade',
    'estado',
    'created_at',
  ];
  const cols = pickColumns(columns, desired);
  const selectSql = cols.length ? cols.join(', ') : 'id';
  const { rows } = await pool.query(
    `SELECT ${selectSql}
     FROM public.profiles
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function getPublicProfileById(pool, id) {
  const columns = await getProfilesColumns(pool);
  const desired = [
    'id',
    'nome',
    'cargo',
    'avatar_url',
    'bio',
    'genero_musical',
    'instagram_url',
    'site_url',
    'youtube_url',
    'spotify_url',
    'deezer_url',
    'tiktok_url',
    'cidade',
    'estado',
    'created_at',
  ];
  const cols = pickColumns(columns, desired);
  const selectSql = cols.length ? cols.join(', ') : 'id';
  const { rows } = await pool.query(
    `SELECT ${selectSql}
     FROM public.profiles
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createProfile(pool, { nome, email, cargo, passwordHash, plano = null, planStartedAt = null }) {
  const columns = await getProfilesColumns(pool);
  const values = [nome, email, cargo, passwordHash];
  const insertCols = ['nome', 'email', 'cargo', 'password_hash'];
  const insertParams = ['$1', '$2', '$3', '$4'];

  const planoNormalized = plano === null ? null : String(plano || '').trim();

  if (planoNormalized && columns.has('plano')) {
    values.push(planoNormalized);
    insertCols.push('plano');
    insertParams.push(`$${values.length}`);
  }
  if (planStartedAt && columns.has('plan_started_at')) {
    values.push(planStartedAt);
    insertCols.push('plan_started_at');
    insertParams.push(`$${values.length}`);
  }

  const { rows } = await pool.query(
    `INSERT INTO public.profiles (${insertCols.join(', ')})
     VALUES (${insertParams.join(', ')})
     RETURNING id, nome, email, cargo, avatar_url, bio, created_at`,
    values
  );
  return rows[0] || null;
}

export async function updateProfileAvatar(pool, { id, avatarUrl }) {
  const { rows } = await pool.query(
    `UPDATE public.profiles
     SET avatar_url = $2
     WHERE id = $1
     RETURNING id, nome, email, cargo, avatar_url, bio, created_at`,
    [id, avatarUrl]
  );
  return rows[0] || null;
}

export async function updateProfileById(pool, { id, patch, includeEmail = true }) {
  const columns = await getProfilesColumns(pool);
  const forbidden = new Set(['id', 'password_hash', 'created_at']);
  if (!includeEmail) forbidden.add('email');

  const patchObj = patch && typeof patch === 'object' ? patch : {};
  const keys = Object.keys(patchObj).filter((k) => columns.has(k) && !forbidden.has(k));
  const filtered = keys
    .map((k) => {
      const v = patchObj[k];
      if (v === null) return [k, null];
      const t = typeof v;
      if (t === 'string' || t === 'number' || t === 'boolean') return [k, v];
      return null;
    })
    .filter(Boolean);

  if (filtered.length === 0) {
    return getProfileById(pool, id);
  }

  const setSql = filtered.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = [id, ...filtered.map(([, v]) => v)];

  await pool.query(
    `UPDATE public.profiles
     SET ${setSql}
     WHERE id = $1`,
    values
  );

  return getProfileById(pool, id);
}

export async function updateProfileAccessControl(pool, { id, accessControl }) {
  const columns = await getProfilesColumns(pool);
  if (!columns.has('access_control')) {
    const e = new Error('Campo access_control não existe');
    e.code = 'NO_COLUMN';
    throw e;
  }

  const payload = accessControl && typeof accessControl === 'object' ? accessControl : {};
  const { rows } = await pool.query(
    `UPDATE public.profiles
     SET access_control = $2::jsonb
     WHERE id = $1
     RETURNING id, access_control`,
    [id, JSON.stringify(payload)]
  );
  return rows[0] || null;
}
