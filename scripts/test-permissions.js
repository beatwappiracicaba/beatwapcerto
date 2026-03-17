// Minimal test runner for RBAC/permissions via public API
// Executes against https://api.beatwap.com.br/api without SSH

const BASE = 'https://api.beatwap.com.br/api';

const ROLE_KEYS = {
  'Artista': ['musics', 'work', 'marketing', 'finance', 'chat'],
  'Compositor': ['compositions', 'marketing', 'finance', 'chat'],
  'Vendedor': ['seller_artists', 'seller_calendar', 'seller_leads', 'seller_finance', 'seller_proposals', 'seller_communications', 'chat'],
  'Produtor': ['admin_artists', 'admin_composers', 'admin_sellers', 'admin_musics', 'admin_sponsors', 'admin_settings', 'admin_finance', 'marketing', 'chat', 'admin_compositions']
};

async function http(method, url, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function login(email, password) {
  const data = await http('POST', `${BASE}/auth/login`, { email, password });
  if (!data || !data.ok || !data.token) {
    throw new Error('Login falhou');
  }
  return data.token;
}

async function getProfiles() {
  return http('GET', `${BASE}/profiles`);
}

function selectByCargo(list, cargo) {
  return (list || []).find(p => String(p.cargo) === cargo) || null;
}

async function getProfilePublic(id) {
  return http('GET', `${BASE}/profiles/${id}`);
}

async function putAccessControl(id, token, accessControlPatch) {
  // Backend accepts either {access_control: {...}} or plain object
  return http('PUT', `${BASE}/profiles/${id}/access-control`, { access_control: accessControlPatch }, token);
}

async function toggleAndVerify(profile, token, key) {
  const id = profile.id;
  const before = (await getProfilePublic(id)) || {};
  const origAC = before.access_control || {};
  const origVal = Object.prototype.hasOwnProperty.call(origAC, key) ? !!origAC[key] : true;

  const patchFalse = { ...origAC, [key]: false };
  await putAccessControl(id, token, patchFalse);
  const afterFalse = await getProfilePublic(id);
  const valFalse = !!(afterFalse?.access_control?.[key] === false);

  const patchRestore = { ...origAC, [key]: origVal };
  await putAccessControl(id, token, patchRestore);
  const afterRestore = await getProfilePublic(id);
  const valRestore = Object.prototype.hasOwnProperty.call(afterRestore?.access_control || {}, key)
    ? !!afterRestore.access_control[key]
    : true;

  return { id, key, toggledToFalse: valFalse, restored: valRestore === origVal, origVal };
}

async function run() {
  const email = 'alangodoygtr@gmail.com';
  const password = '@Aggtr4907';
  const report = [];

  const token = await login(email, password);
  const list = await getProfiles();

  for (const cargo of Object.keys(ROLE_KEYS)) {
    const profile = selectByCargo(list, cargo);
    if (!profile) {
      report.push({ cargo, error: 'Perfil não encontrado' });
      continue;
    }
    const keys = ROLE_KEYS[cargo];
    for (const key of keys) {
      try {
        const r = await toggleAndVerify(profile, token, key);
        report.push({ cargo, ...r });
      } catch (e) {
        report.push({ cargo, id: profile.id, key, error: e.message, details: e.data || null });
      }
    }
  }

  // Summarize
  const summary = report.reduce((acc, r) => {
    const k = r.cargo;
    acc[k] = acc[k] || { total: 0, ok: 0, errors: 0 };
    acc[k].total += 1;
    if (r.error) acc[k].errors += 1;
    else if (r.toggledToFalse && r.restored) acc[k].ok += 1;
    return acc;
  }, {});

  console.log('=== RESULTADOS DE PERMISSÕES ===');
  console.log(JSON.stringify({ summary, report }, null, 2));
}

run().catch(err => {
  console.error('Erro geral:', err);
  process.exit(1);
});

