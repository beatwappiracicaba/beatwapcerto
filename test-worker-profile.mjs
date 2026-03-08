const API = 'https://beatwap-api-worker.beatwappiracicaba.workers.dev';

async function json(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function run() {
  console.log('Seed profile');
  const seed = await fetch(`${API}/debug/seed-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'producer.test@beatwap.com', nome: 'Produtor Teste', cargo: 'Produtor' })
  }).then(json);
  console.log('Seed result:', seed);

  console.log('Login');
  const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'producer.test@beatwap.com', password: 'x' })
  }).then(json);
  console.log('Login result:', login);
  const token = login?.data?.token;
  if (!token) {
    console.error('No token');
    process.exit(1);
  }

  console.log('Update profile name');
  const upd = await fetch(`${API}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nome: 'Produtor Atualizado' })
  }).then(json);
  console.log('Update profile:', upd);

  console.log('Update avatar');
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBev3rYH8AAAAASUVORK5CYII=';
  const avatar = await fetch(`${API}/api/profile/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dataUrl: tinyPng })
  }).then(json);
  console.log('Avatar update:', avatar);

  console.log('Get profile');
  const me = await fetch(`${API}/api/profile`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }).then(json);
  console.log('My profile:', me);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
