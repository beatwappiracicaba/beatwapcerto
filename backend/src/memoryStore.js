const fs = require('fs');
const path = require('path');

const storagePath = path.resolve(__dirname, '..', 'memory-store.json');

function ensureDefaults(m) {
  if (!m || typeof m !== 'object') return {};
  if (!m.compositions) m.compositions = [];
  if (!Array.isArray(m.hashtags)) m.hashtags = [];
  if (!m.email_verification || typeof m.email_verification !== 'object') m.email_verification = {};
  if (!m.analytics) m.analytics = [];
  if (!m.events) m.events = [];
  if (!m.posts) m.posts = [];
  if (!m.likes) m.likes = {};
  if (!m.comments) m.comments = {};
  if (!m.follows || typeof m.follows !== 'object') m.follows = {};
  if (Array.isArray(m.follows)) {
    const next = {};
    for (const row of m.follows) {
      const userId = String(row?.userId || row?.followerId || row?.from || '').trim();
      const followId = String(row?.followId || row?.targetId || row?.to || '').trim();
      if (!userId || !followId) continue;
      if (!Array.isArray(next[userId])) next[userId] = [];
      if (!next[userId].includes(followId)) next[userId].push(followId);
    }
    m.follows = next;
  }
  if (!m.externalMetrics) m.externalMetrics = {};
  if (!m.musics) m.musics = [];
  if (!m.projects) m.projects = [];
  if (!m.marketing) m.marketing = {};
  if (!m.artist_work_events) m.artist_work_events = [];
  if (!m.artist_todos) m.artist_todos = [];
  if (!m.profileGallery) m.profileGallery = {};
  if (!m.sponsors) m.sponsors = [];
  if (!m.featured_plans || typeof m.featured_plans !== 'object') {
    m.featured_plans = {
      cta: 'Apareça primeiro e aumente suas chances de ser descoberto',
      plans: {
        basic: { level: 'basic', label: 'Destaque Básico', price: 10, duration_hours: 24, pinned: false },
        pro: { level: 'pro', label: 'Destaque Pro', price: 25, duration_hours: 72, pinned: false },
        top: { level: 'top', label: 'Destaque Top', price: 50, duration_hours: 168, pinned: true }
      },
      updated_at: new Date().toISOString()
    };
  } else {
    if (!m.featured_plans.cta) m.featured_plans.cta = 'Apareça primeiro e aumente suas chances de ser descoberto';
    if (!m.featured_plans.plans || typeof m.featured_plans.plans !== 'object') m.featured_plans.plans = {};
    const p = m.featured_plans.plans;
    if (!p.basic) p.basic = { level: 'basic', label: 'Destaque Básico', price: 10, duration_hours: 24, pinned: false };
    if (!p.pro) p.pro = { level: 'pro', label: 'Destaque Pro', price: 25, duration_hours: 72, pinned: false };
    if (!p.top) p.top = { level: 'top', label: 'Destaque Top', price: 50, duration_hours: 168, pinned: true };
    if (!m.featured_plans.updated_at) m.featured_plans.updated_at = new Date().toISOString();
  }
  if (!m.hit_of_week || typeof m.hit_of_week !== 'object') {
    m.hit_of_week = {
      id: `hit_${Date.now()}`,
      theme: 'Hit da Semana BeatWap',
      starts_at: null,
      ends_at: null,
      entry_fee: 10,
      entries: [],
      winner_entry_id: null,
      updated_at: new Date().toISOString()
    };
  } else {
    if (!m.hit_of_week.id) m.hit_of_week.id = `hit_${Date.now()}`;
    if (!m.hit_of_week.theme) m.hit_of_week.theme = 'Hit da Semana BeatWap';
    if (!Object.prototype.hasOwnProperty.call(m.hit_of_week, 'starts_at')) m.hit_of_week.starts_at = null;
    if (!Object.prototype.hasOwnProperty.call(m.hit_of_week, 'ends_at')) m.hit_of_week.ends_at = null;
    if (!Object.prototype.hasOwnProperty.call(m.hit_of_week, 'entry_fee')) m.hit_of_week.entry_fee = 10;
    if (!Array.isArray(m.hit_of_week.entries)) m.hit_of_week.entries = [];
    if (!Object.prototype.hasOwnProperty.call(m.hit_of_week, 'winner_entry_id')) m.hit_of_week.winner_entry_id = null;
    if (!m.hit_of_week.updated_at) m.hit_of_week.updated_at = new Date().toISOString();
  }
  return m;
}

function readFromDisk(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeFileAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmpPath, data, 'utf8');
  await fs.promises.rename(tmpPath, filePath);
}

const memory = (() => {
  const base = global.__beatwap_memory && typeof global.__beatwap_memory === 'object'
    ? global.__beatwap_memory
    : {};
  const fromDisk = readFromDisk(storagePath);
  if (fromDisk) Object.assign(base, fromDisk);
  ensureDefaults(base);
  global.__beatwap_memory = base;
  return base;
})();

let saveTimer = null;
let saving = false;
let saveQueued = false;

async function doSave() {
  if (saving) {
    saveQueued = true;
    return;
  }
  saving = true;
  saveQueued = false;
  try {
    const json = JSON.stringify(memory);
    await writeFileAtomic(storagePath, json);
  } catch {
    void 0;
  } finally {
    saving = false;
  }
  if (saveQueued) scheduleSave();
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    doSave();
  }, 150);
}

module.exports = {
  memory,
  scheduleSave,
  storagePath
};
