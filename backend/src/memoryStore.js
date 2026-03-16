const fs = require('fs');
const path = require('path');

const storagePath = path.resolve(__dirname, '..', 'memory-store.json');

function ensureDefaults(m) {
  if (!m || typeof m !== 'object') return {};
  if (!m.compositions) m.compositions = [];
  if (!m.analytics) m.analytics = [];
  if (!m.events) m.events = [];
  if (!m.posts) m.posts = [];
  if (!m.likes) m.likes = {};
  if (!m.externalMetrics) m.externalMetrics = {};
  if (!m.musics) m.musics = [];
  if (!m.projects) m.projects = [];
  if (!m.marketing) m.marketing = {};
  if (!m.artist_work_events) m.artist_work_events = [];
  if (!m.artist_todos) m.artist_todos = [];
  if (!m.profileGallery) m.profileGallery = {};
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

