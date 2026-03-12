import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import releasesRoutes from './releases.route.js';
import profilesRoutes from './profiles.route.js';
import authRoutes from './auth.route.js';
import { authRequired } from '../middleware/auth.js';
import { pool } from '../db.js';
import { getProfileById, listProfiles } from '../models/profiles.model.js';

const router = Router();

router.use(releasesRoutes);
router.use(profilesRoutes);
router.use(authRoutes);

const memory = globalThis.__beatwapMemory || (globalThis.__beatwapMemory = {
  queue: [],
  chats: [],
  notifications: [],
  artistMetrics: new Map(),
  aiHistory: new Map(),
  producerProjects: [],
  musics: [],
  posts: [],
});
if (!Array.isArray(memory.sellerArtistEvents)) memory.sellerArtistEvents = [];
if (!Array.isArray(memory.musicExternalMetrics)) memory.musicExternalMetrics = [];
if (!Array.isArray(memory.todos)) memory.todos = [];
if (!Array.isArray(memory.compositions)) memory.compositions = [];
if (!Array.isArray(memory.sponsors)) memory.sponsors = [];
if (!Array.isArray(memory.sellerGoals)) memory.sellerGoals = [];
if (!Array.isArray(memory.sellerCommissions)) memory.sellerCommissions = [];
if (!Array.isArray(memory.sellerLeads)) memory.sellerLeads = [];
if (!Array.isArray(memory.artistEvents)) memory.artistEvents = [];
if (!Array.isArray(memory.financeEvents)) memory.financeEvents = [];
if (!memory.realtime || typeof memory.realtime !== 'object') memory.realtime = { clients: new Map() };
if (!(memory.realtime.clients instanceof Map)) memory.realtime.clients = new Map();
if (!Array.isArray(memory.sellerProposals)) memory.sellerProposals = [];
if (!Array.isArray(memory.contractors)) memory.contractors = [];
if (!(memory.sellerLeadHistory instanceof Map)) memory.sellerLeadHistory = new Map();

const roleMap = {
  artist: 'Artista',
  artista: 'Artista',
  producer: 'Produtor',
  produtor: 'Produtor',
  admin: 'Produtor',
  seller: 'Vendedor',
  vendedor: 'Vendedor',
  composer: 'Compositor',
  compositor: 'Compositor',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

function sanitizeBucket(bucketRaw) {
  const b = bucketRaw ? String(bucketRaw) : '';
  if (!b) return 'uploads';
  if (!/^[a-zA-Z0-9_-]+$/.test(b)) return 'uploads';
  return b;
}

function sanitizeFileName(fileNameRaw) {
  const raw = fileNameRaw ? String(fileNameRaw) : '';
  const cleaned = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  const normalized = path.posix.normalize(cleaned);
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null;
  return normalized;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const bucket = sanitizeBucket(req.body && req.body.bucket ? req.body.bucket : '');
        const fileNameNormalized = sanitizeFileName(req.body && req.body.fileName ? req.body.fileName : file.originalname);
        if (!fileNameNormalized) return cb(new Error('fileName inválido'));
        const dir = path.posix.dirname(fileNameNormalized);
        const dest = path.join(uploadsRoot, bucket, dir === '.' ? '' : dir);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const fileNameNormalized = sanitizeFileName(req.body && req.body.fileName ? req.body.fileName : file.originalname);
      if (!fileNameNormalized) return cb(new Error('fileName inválido'));
      cb(null, path.posix.basename(fileNameNormalized));
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function buildPublicUrl(req, bucket, fileNameNormalized) {
  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http');
  const host = String(req.get('host') || '');
  const base = host ? `${proto}://${host}` : '';
  const urlPath = `/uploads/${bucket}/${fileNameNormalized}`;
  return base ? `${base}${encodeURI(urlPath)}` : encodeURI(urlPath);
}

router.post('/upload', authRequired, upload.single('file'), (req, res) => {
  const bucket = sanitizeBucket(req.body && req.body.bucket ? req.body.bucket : '');
  const fileNameNormalized = sanitizeFileName(req.body && req.body.fileName ? req.body.fileName : (req.file ? req.file.originalname : ''));
  if (!req.file || !fileNameNormalized) return res.status(400).json({ error: 'Arquivo é obrigatório' });
  res.json({ url: buildPublicUrl(req, bucket, fileNameNormalized) });
});

router.post('/upload/single', authRequired, upload.single('file'), (req, res) => {
  const bucket = sanitizeBucket(req.body && req.body.bucket ? req.body.bucket : 'uploads');
  const fileNameNormalized = sanitizeFileName(req.body && req.body.fileName ? req.body.fileName : (req.file ? req.file.originalname : ''));
  if (!req.file || !fileNameNormalized) return res.status(400).json({ error: 'Arquivo é obrigatório' });
  res.json({ url: buildPublicUrl(req, bucket, fileNameNormalized) });
});

router.post('/upload/multiple', authRequired, upload.array('files', 10), (req, res) => {
  const bucket = sanitizeBucket(req.body && req.body.bucket ? req.body.bucket : 'uploads');
  const files = Array.isArray(req.files) ? req.files : [];
  const urls = files
    .map((f) => {
      const fileNameNormalized = sanitizeFileName(f.originalname);
      if (!fileNameNormalized) return null;
      return buildPublicUrl(req, bucket, fileNameNormalized);
    })
    .filter(Boolean);
  res.json({ urls });
});

router.get('/ai/history', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  if (!(memory.aiHistory instanceof Map)) memory.aiHistory = new Map();
  const rows = memory.aiHistory.get(requesterId) || [];
  res.set('Cache-Control', 'no-store');
  res.json(rows.slice(-200));
});

router.post('/ai/history', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const role = req.body && req.body.role ? String(req.body.role) : '';
  const content = req.body && req.body.content ? String(req.body.content) : '';
  if (!role || (role !== 'user' && role !== 'assistant' && role !== 'system')) return res.status(400).json({ error: 'role inválido' });
  if (!content) return res.status(400).json({ error: 'content é obrigatório' });

  if (!(memory.aiHistory instanceof Map)) memory.aiHistory = new Map();
  const prev = memory.aiHistory.get(requesterId) || [];
  const row = { id: randomUUID(), user_id: requesterId, role, content, created_at: new Date().toISOString() };
  const next = [...prev, row].slice(-500);
  memory.aiHistory.set(requesterId, next);

  res.status(201).json(row);
});

router.post('/ai/history/clear', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  if (!(memory.aiHistory instanceof Map)) memory.aiHistory = new Map();
  memory.aiHistory.set(requesterId, []);
  res.json({ ok: true });
});

router.post('/ai/chat', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  const lastUser = [...messages].reverse().find((m) => m && typeof m === 'object' && String(m.role || '').toLowerCase() === 'user');
  const prompt = lastUser && lastUser.content ? String(lastUser.content) : '';

  const reply = prompt
    ? `Recebi sua mensagem: "${prompt}". No momento o Assistente de IA está em modo básico (sem integração externa).`
    : 'Envie uma mensagem para eu responder.';

  if (!(memory.aiHistory instanceof Map)) memory.aiHistory = new Map();
  const prev = memory.aiHistory.get(requesterId) || [];
  const next = [...prev, { id: randomUUID(), user_id: requesterId, role: 'assistant', content: reply, created_at: new Date().toISOString() }].slice(-500);
  memory.aiHistory.set(requesterId, next);

  res.json({ reply });
});

function isUuidLike(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
}

function isMissingTableError(err) {
  return !!(err && (err.code === '42P01' || /does not exist/i.test(String(err.message || ''))));
}

function tryDecodeUser(req) {
  const auth = req && req.headers && req.headers.authorization ? String(req.headers.authorization) : '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function isSellerOrAdmin(req) {
  const cargo = req && req.user && req.user.cargo ? String(req.user.cargo) : '';
  return cargo === 'Vendedor' || cargo === 'Produtor';
}

function isValidMonth(v) {
  return /^\d{4}-\d{2}$/.test(String(v || ''));
}

function getMonthPrefix(v) {
  return String(v || '').slice(0, 7);
}

function sseWrite(res, event, payload) {
  const safePayload = payload === undefined ? null : payload;
  const body = `event: ${event}\ndata: ${JSON.stringify(safePayload)}\n\n`;
  res.write(body);
}

function registerRealtimeClient({ userId, cargo, res }) {
  if (!memory.realtime || typeof memory.realtime !== 'object') memory.realtime = { clients: new Map() };
  if (!(memory.realtime.clients instanceof Map)) memory.realtime.clients = new Map();
  const store = memory.realtime.clients;
  const prev = store.get(userId);
  const list = Array.isArray(prev) ? prev : [];
  const item = { res, cargo };
  store.set(userId, [...list, item]);
  return () => {
    const curr = store.get(userId);
    if (!Array.isArray(curr)) return;
    const next = curr.filter((c) => c && c.res !== res);
    if (next.length) store.set(userId, next);
    else store.delete(userId);
  };
}

function emitRealtimeToUsers(userIds, event, payload) {
  if (!memory.realtime || typeof memory.realtime !== 'object') return;
  if (!(memory.realtime.clients instanceof Map)) return;
  const store = memory.realtime.clients;
  const unique = Array.from(new Set((Array.isArray(userIds) ? userIds : []).map(String).filter(Boolean)));
  for (const userId of unique) {
    const clients = store.get(userId);
    if (!Array.isArray(clients) || !clients.length) continue;
    const alive = [];
    for (const c of clients) {
      try {
        if (c && c.res && !c.res.writableEnded) {
          sseWrite(c.res, event, payload);
          alive.push(c);
        }
      } catch { void 0; }
    }
    if (alive.length) store.set(userId, alive);
    else store.delete(userId);
  }
}

function emitRealtimeToRole(cargo, event, payload) {
  if (!memory.realtime || typeof memory.realtime !== 'object') return;
  if (!(memory.realtime.clients instanceof Map)) return;
  const store = memory.realtime.clients;
  for (const [userId, clients] of store.entries()) {
    if (!Array.isArray(clients) || !clients.length) continue;
    const alive = [];
    for (const c of clients) {
      try {
        if (c && c.res && !c.res.writableEnded) {
          if (String(c.cargo || '') === String(cargo || '')) {
            sseWrite(c.res, event, payload);
          }
          alive.push(c);
        }
      } catch { void 0; }
    }
    if (alive.length) store.set(userId, alive);
    else store.delete(userId);
  }
}

router.post('/analytics', async (req, res, next) => {
  try {
    const type = req.body && req.body.type ? String(req.body.type) : '';
    const allowed =
      type === 'music_play' ||
      type === 'music_click_presave' ||
      type === 'music_click_smartlink' ||
      type === 'profile_view' ||
      type === 'sponsor_click' ||
      type.startsWith('artist_click_');
    if (!allowed) return res.status(400).json({ error: 'Tipo de evento inválido' });

    const artist_id = req.body && req.body.artist_id ? String(req.body.artist_id) : null;
    const music_id = req.body && req.body.music_id ? String(req.body.music_id) : null;
    const ip_hash = req.body && req.body.ip_hash ? String(req.body.ip_hash) : null;
    const duration_seconds = Number(req.body && req.body.duration_seconds ? req.body.duration_seconds : 0) || 0;
    const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

    const artistIdToStore = artist_id && isUuidLike(artist_id) ? artist_id : null;
    const musicIdToStore = music_id && isUuidLike(music_id) ? music_id : null;

    const { rows } = await pool.query(
      `INSERT INTO public.analytics_events
        (id, type, artist_id, music_id, duration_seconds, ip_hash, metadata)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, type, artist_id, music_id, duration_seconds, ip_hash, created_at`,
      [type, artistIdToStore, musicIdToStore, duration_seconds || null, ip_hash, JSON.stringify(metadata)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (isMissingTableError(err)) {
      if (!Array.isArray(memory.analytics_events)) memory.analytics_events = [];
      const row = {
        id: randomUUID(),
        type: req.body && req.body.type ? String(req.body.type) : '',
        artist_id: req.body && req.body.artist_id ? String(req.body.artist_id) : null,
        music_id: req.body && req.body.music_id ? String(req.body.music_id) : null,
        duration_seconds: Number(req.body && req.body.duration_seconds ? req.body.duration_seconds : 0) || 0,
        ip_hash: req.body && req.body.ip_hash ? String(req.body.ip_hash) : null,
        metadata: req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {},
        created_at: new Date().toISOString(),
      };
      memory.analytics_events.unshift(row);
      return res.status(201).json(row);
    }
    next(err);
  }
});

router.get('/compositions', async (req, res) => {
  const rows = (Array.isArray(memory.compositions) ? memory.compositions : [])
    .filter((c) => c && typeof c === 'object')
    .filter((c) => String(c.status || '') === 'approved')
    .slice(0, 50);
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.post('/compositions', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const canCreateForOther = cargo === 'Produtor';

  const composer_id = req.body && req.body.composer_id ? String(req.body.composer_id) : requesterId;
  if (!composer_id || !isUuidLike(composer_id)) return res.status(400).json({ error: 'composer_id inválido' });
  if (!canCreateForOther && composer_id !== requesterId) return res.status(403).json({ error: 'Sem permissão' });

  const title = req.body && req.body.title ? String(req.body.title).trim() : '';
  const genre = req.body && req.body.genre ? String(req.body.genre).trim() : '';
  const audio_url = req.body && req.body.audio_url ? String(req.body.audio_url).trim() : '';
  const cover_url = req.body && req.body.cover_url ? String(req.body.cover_url).trim() : null;
  const description = req.body && req.body.description ? String(req.body.description).trim() : null;
  const price = (req.body && (req.body.price ?? req.body.valor ?? req.body.preco) != null)
    ? (Number(req.body.price ?? req.body.valor ?? req.body.preco) || null)
    : null;
  const status = req.body && req.body.status ? String(req.body.status) : 'pending';

  if (!title) return res.status(400).json({ error: 'title é obrigatório' });
  if (!genre) return res.status(400).json({ error: 'genre é obrigatório' });
  if (!audio_url) return res.status(400).json({ error: 'audio_url é obrigatório' });

  const row = {
    id: randomUUID(),
    composer_id,
    title,
    genre,
    description,
    price,
    cover_url,
    audio_url,
    status,
    admin_feedback: null,
    created_at: new Date().toISOString(),
  };

  memory.compositions.unshift(row);
  res.status(201).json(row);
});

router.get('/composer/compositions', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const canReadOther = cargo === 'Produtor';

  const qComposerId = req.query && req.query.composer_id ? String(req.query.composer_id) : '';
  const composerId = (canReadOther && qComposerId && isUuidLike(qComposerId)) ? qComposerId : requesterId;

  const rows = (Array.isArray(memory.compositions) ? memory.compositions : [])
    .filter((c) => c && typeof c === 'object')
    .filter((c) => String(c.composer_id || '') === composerId)
    .slice(0, 500);

  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.get('/admin/compositions', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
  const rows = (Array.isArray(memory.compositions) ? memory.compositions : [])
    .filter((c) => c && typeof c === 'object')
    .slice(0, 5000);
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.put('/admin/compositions/:id/status', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const status = req.body && req.body.status ? String(req.body.status) : '';
  const feedback = req.body && req.body.feedback ? String(req.body.feedback) : null;
  if (!status) return res.status(400).json({ error: 'status é obrigatório' });

  const store = Array.isArray(memory.compositions) ? memory.compositions : (memory.compositions = []);
  const idx = store.findIndex((c) => c && typeof c === 'object' && String(c.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Composição não encontrada' });

  const prev = store[idx];
  const next = {
    ...prev,
    status,
    admin_feedback: feedback,
    updated_at: new Date().toISOString(),
  };
  store[idx] = next;
  res.json(next);
});
router.get('/projects', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, producer_id, title, url, platform, published, created_at
       FROM public.producer_projects
       WHERE published = true
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.set('Cache-Control', 'no-store');
    res.json(rows);
  } catch (err) {
    if (isMissingTableError(err)) {
      const rows = (Array.isArray(memory.producerProjects) ? memory.producerProjects : [])
        .filter((p) => (!p || typeof p !== 'object') ? false : (typeof p.published === 'boolean' ? p.published : true))
        .slice(0, 50);
      res.set('Cache-Control', 'no-store');
      return res.json(rows);
    }
    next(err);
  }
});
router.get('/composers', async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Compositor', limit: 500 });
    res.json(rows);
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.json([]);
    }
    next(err);
  }
});
router.get('/sponsors', (req, res) => {
  const decoded = tryDecodeUser(req);
  const cargo = decoded && decoded.cargo ? String(decoded.cargo) : '';
  const isAdmin = cargo === 'Produtor';

  const rows = (Array.isArray(memory.sponsors) ? memory.sponsors : [])
    .filter((s) => s && typeof s === 'object')
    .filter((s) => isAdmin ? true : !!s.active)
    .slice(0, 5000);

  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.post('/sponsors', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const name = req.body && req.body.name ? String(req.body.name).trim() : '';
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });

  const instagram_url = req.body && req.body.instagram_url ? String(req.body.instagram_url).trim() : null;
  const site_url = req.body && req.body.site_url ? String(req.body.site_url).trim() : null;
  const logo_data = req.body && req.body.logo_data ? String(req.body.logo_data) : null;

  const row = {
    id: randomUUID(),
    name,
    instagram_url: instagram_url || null,
    site_url: site_url || null,
    logo_url: logo_data || null,
    active: true,
    created_by: req.user && req.user.id ? String(req.user.id) : null,
    created_at: new Date().toISOString(),
  };

  memory.sponsors.unshift(row);
  res.status(201).json(row);
});

router.put('/sponsors/:id', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sponsors) ? memory.sponsors : (memory.sponsors = []);
  const idx = store.findIndex((s) => s && typeof s === 'object' && String(s.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Patrocinador não encontrado' });

  const prev = store[idx];
  const patch = (req.body && typeof req.body === 'object') ? req.body : {};
  const next = { ...prev };

  if (typeof patch.active === 'boolean') next.active = patch.active;
  if (patch.name != null) next.name = String(patch.name).trim();
  if (patch.instagram_url != null) next.instagram_url = String(patch.instagram_url).trim() || null;
  if (patch.site_url != null) next.site_url = String(patch.site_url).trim() || null;
  if (patch.logo_data != null) next.logo_url = String(patch.logo_data) || null;

  next.updated_at = new Date().toISOString();
  store[idx] = next;
  res.json(next);
});

router.delete('/sponsors/:id', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sponsors) ? memory.sponsors : (memory.sponsors = []);
  const idx = store.findIndex((s) => s && typeof s === 'object' && String(s.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Patrocinador não encontrado' });

  store.splice(idx, 1);
  res.json({ ok: true });
});
router.get('/producers', async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Produtor', limit: 500 });
    res.json(rows);
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.json([]);
    }
    next(err);
  }
});

router.get('/albums/:albumId/tracks', (req, res) => {
  const albumId = req.params && req.params.albumId ? String(req.params.albumId) : '';
  if (!albumId || !isUuidLike(albumId)) return res.status(400).json({ error: 'albumId inválido' });

  const rows = (Array.isArray(memory.musics) ? memory.musics : [])
    .filter((m) => m && typeof m === 'object')
    .filter((m) => String(m.status || '') === 'aprovado')
    .filter((m) => String(m.album_id || '') === albumId)
    .map((m) => ({
      id: String(m.id || ''),
      album_id: albumId,
      album_title: m.album_title ?? null,
      titulo: m.titulo ?? m.title ?? '',
      nome_artista: m.nome_artista ?? m.artist_name ?? null,
      artista_id: m.artista_id ?? m.artist_id ?? null,
      cover_url: m.cover_url ?? null,
      audio_url: m.audio_url ?? null,
      preview_url: m.preview_url ?? m.audio_url ?? null,
      release_date: m.release_date ?? null,
      estilo: m.estilo ?? null,
      presave_link: m.presave_link ?? null,
      created_at: m.created_at ?? null,
    }))
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.get('/marketing/:artistId', authRequired, (req, res) => {
  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const canReadOther = cargo === 'Produtor';
  if (!canReadOther && requesterId !== artistId) return res.status(403).json({ error: 'Sem permissão' });

  const store = (memory.marketing_by_artist && typeof memory.marketing_by_artist === 'object') ? memory.marketing_by_artist : (memory.marketing_by_artist = {});
  res.set('Cache-Control', 'no-store');
  res.json(store[artistId] || null);
});

router.put('/marketing/:artistId', authRequired, (req, res) => {
  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const canEditOther = cargo === 'Produtor';
  if (!canEditOther && requesterId !== artistId) return res.status(403).json({ error: 'Sem permissão' });

  const patch = (req.body && typeof req.body === 'object') ? req.body : {};
  const store = (memory.marketing_by_artist && typeof memory.marketing_by_artist === 'object') ? memory.marketing_by_artist : (memory.marketing_by_artist = {});
  const prev = (store[artistId] && typeof store[artistId] === 'object') ? store[artistId] : {};
  const next = { ...prev, ...patch, artist_id: artistId, updated_at: new Date().toISOString() };
  store[artistId] = next;

  res.set('Cache-Control', 'no-store');
  res.json(next);
});

router.get('/artist/marketing/:artistId', authRequired, (req, res) => {
  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const canReadOther = cargo === 'Produtor';
  if (!canReadOther && requesterId !== artistId) return res.status(403).json({ error: 'Sem permissão' });

  const store = (memory.marketing_by_artist && typeof memory.marketing_by_artist === 'object') ? memory.marketing_by_artist : (memory.marketing_by_artist = {});
  res.set('Cache-Control', 'no-store');
  res.json(store[artistId] || null);
});

router.put('/artist/marketing/:artistId', authRequired, (req, res) => {
  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const canEditOther = cargo === 'Produtor';
  if (!canEditOther && requesterId !== artistId) return res.status(403).json({ error: 'Sem permissão' });

  const patch = (req.body && typeof req.body === 'object') ? req.body : {};
  const store = (memory.marketing_by_artist && typeof memory.marketing_by_artist === 'object') ? memory.marketing_by_artist : (memory.marketing_by_artist = {});
  const prev = (store[artistId] && typeof store[artistId] === 'object') ? store[artistId] : {};
  const next = { ...prev, ...patch, artist_id: artistId, updated_at: new Date().toISOString() };
  store[artistId] = next;

  res.set('Cache-Control', 'no-store');
  res.json(next);
});

router.get('/artist/events', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const rows = (Array.isArray(memory.artistEvents) ? memory.artistEvents : [])
    .filter((e) => e && typeof e === 'object')
    .filter((e) => String(e.artist_id || '') === requesterId)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.post('/artist/events', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const title = req.body && req.body.title ? String(req.body.title).trim() : '';
  const date = req.body && req.body.date ? String(req.body.date).trim() : '';
  const type = req.body && req.body.type ? String(req.body.type).trim() : '';
  const notes = req.body && req.body.notes ? String(req.body.notes) : '';
  if (!title || !date) return res.status(400).json({ error: 'title e date são obrigatórios' });
  const event = {
    id: randomUUID(),
    artist_id: requesterId,
    title,
    date,
    type: type || 'outro',
    notes,
    created_at: new Date().toISOString(),
  };
  memory.artistEvents.unshift(event);
  res.status(201).json(event);
});

router.get('/artist/todos', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const rows = (Array.isArray(memory.todos) ? memory.todos : [])
    .filter((t) => t && typeof t === 'object')
    .filter((t) => String(t.artist_id || '') === requesterId)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.post('/artist/todos', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const title = req.body && req.body.title ? String(req.body.title).trim() : '';
  const due_date = req.body && req.body.due_date ? String(req.body.due_date) : null;
  if (!title) return res.status(400).json({ error: 'title é obrigatório' });
  const now = new Date().toISOString();
  const todo = {
    id: randomUUID(),
    artist_id: requesterId,
    title,
    due_date: due_date || null,
    status: 'pendente',
    created_at: now,
    updated_at: now,
  };
  memory.todos.unshift(todo);
  res.status(201).json(todo);
});

router.post('/artist/todos/:id', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });
  const status = req.body && req.body.status ? String(req.body.status).trim() : '';
  if (!status || (status !== 'pendente' && status !== 'concluido')) return res.status(400).json({ error: 'status inválido' });
  const store = Array.isArray(memory.todos) ? memory.todos : (memory.todos = []);
  const idx = store.findIndex((t) => t && typeof t === 'object' && String(t.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Todo não encontrado' });
  const prev = store[idx];
  if (String(prev.artist_id || '') !== requesterId) return res.status(403).json({ error: 'Sem permissão' });
  const next = { ...prev, status, updated_at: new Date().toISOString() };
  store[idx] = next;
  res.json(next);
});

router.get('/artist/compositions', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const rows = (Array.isArray(memory.compositions) ? memory.compositions : [])
    .filter((c) => c && typeof c === 'object')
    .filter((c) => String(c.composer_id || '') === requesterId)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.get('/artist/finance/events', authRequired, async (req, res, next) => {
  try {
    const requesterId = req.user && req.user.id ? String(req.user.id) : '';
    if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    const canReadOther = cargo === 'Produtor';
    const qArtistId = req.query && (req.query.artist_id || req.query.artista_id) ? String(req.query.artist_id || req.query.artista_id) : '';
    const artistId = (canReadOther && qArtistId && isUuidLike(qArtistId)) ? qArtistId : requesterId;

    const rows = (Array.isArray(memory.financeEvents) ? memory.financeEvents : [])
      .filter((e) => e && typeof e === 'object')
      .filter((e) => String(e.artist_id || '') === artistId)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 2000);

    const uniqueIds = Array.from(
      new Set(
        rows
          .flatMap((e) => [e.artist_id, e.seller_id])
          .filter((id) => id && isUuidLike(id))
          .map(String)
      )
    );

    const profilesById = {};
    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const p = await getProfileById(pool, id);
          if (p) profilesById[id] = p;
        } catch { void 0; }
      })
    );

    res.set('Cache-Control', 'no-store');
    res.json(
      rows.map((e) => ({
        ...e,
        artist: profilesById[String(e.artist_id)] ? {
          id: profilesById[String(e.artist_id)].id,
          nome: profilesById[String(e.artist_id)].nome || profilesById[String(e.artist_id)].nome_completo_razao_social,
          avatar_url: profilesById[String(e.artist_id)].avatar_url,
        } : null,
        seller: profilesById[String(e.seller_id)] ? {
          id: profilesById[String(e.seller_id)].id,
          nome: profilesById[String(e.seller_id)].nome || profilesById[String(e.seller_id)].nome_completo_razao_social,
          avatar_url: profilesById[String(e.seller_id)].avatar_url,
        } : null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post('/artist/finance/events/:id/receipts', authRequired, (req, res) => {
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const isSeller = cargo === 'Vendedor';
  const isProducer = cargo === 'Produtor';
  if (!isSeller && !isProducer) return res.status(403).json({ error: 'Sem permissão' });

  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.financeEvents) ? memory.financeEvents : (memory.financeEvents = []);
  const idx = store.findIndex((e) => e && typeof e === 'object' && String(e.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Evento não encontrado' });

  const prev = store[idx];
  if (isSeller && prev.seller_id && String(prev.seller_id) !== requesterId) return res.status(403).json({ error: 'Sem permissão' });

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const markAsPaid = typeof body.markAsPaid === 'boolean' ? body.markAsPaid : null;
  const hasContract = typeof body.hasContract === 'boolean' ? body.hasContract : null;

  const next = {
    ...prev,
    receipt_artist: body.receipt_artist || prev.receipt_artist || null,
    receipt_seller: body.receipt_seller || prev.receipt_seller || null,
    receipt_house: body.receipt_house || prev.receipt_house || null,
    receipt_manager: body.receipt_manager || prev.receipt_manager || null,
    contract_file: body.contract_file || prev.contract_file || null,
    contract_url: body.contract_file || prev.contract_url || prev.contract_file || null,
    has_contract: hasContract === null ? (prev.has_contract || false) : hasContract,
    status: markAsPaid === null ? (prev.status || 'pendente') : (markAsPaid ? 'pago' : 'pendente'),
    updated_at: new Date().toISOString(),
  };

  store[idx] = next;
  res.set('Cache-Control', 'no-store');
  res.json(next);
});

router.get('/analytics/artist/:artistId/summary', authRequired, async (req, res, next) => {
  try {
    const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
    if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

    const { rows } = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'music_play' THEN 1 ELSE 0 END), 0)::int AS plays,
        COALESCE(COUNT(DISTINCT CASE WHEN type = 'music_play' THEN ip_hash ELSE NULL END), 0)::int AS listeners,
        COALESCE(SUM(CASE WHEN type = 'music_play' THEN COALESCE(duration_seconds, 0) ELSE 0 END), 0)::int AS time,
        COALESCE(SUM(CASE WHEN type = 'profile_view' THEN 1 ELSE 0 END), 0)::int AS profile_views,
        COALESCE(SUM(CASE WHEN type LIKE 'artist_click_%' THEN 1 ELSE 0 END), 0)::int AS social_clicks
       FROM public.analytics_events
       WHERE artist_id = $1`,
      [artistId]
    );

    res.json(rows[0] || { plays: 0, listeners: 0, time: 0, profile_views: 0, social_clicks: 0 });
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.json({ plays: 0, listeners: 0, time: 0, profile_views: 0, social_clicks: 0 });
    }
    next(err);
  }
});

router.get('/analytics/artist/:artistId/events', authRequired, async (req, res, next) => {
  try {
    const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
    if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

    const { rows } = await pool.query(
      `SELECT
        id,
        type,
        artist_id,
        music_id,
        duration_seconds,
        ip_hash,
        created_at
       FROM public.analytics_events
       WHERE artist_id = $1
       ORDER BY created_at DESC
       LIMIT 5000`,
      [artistId]
    );
    res.json(rows);
  } catch (err) {
    if (isMissingTableError(err)) {
      return res.json([]);
    }
    next(err);
  }
});

router.get('/admin/stats', authRequired, (req, res) => {
  Promise.resolve()
    .then(async () => {
      const artists = await listProfiles(pool, { cargo: 'Artista', limit: 500 });
      const pending = 0;
      const musics = memory.musics.length;
      res.json({ artists: artists.length, musics, pending });
    })
    .catch(() => res.json({ artists: 0, musics: memory.musics.length, pending: 0 }));
});

router.get('/admin/artist/:artistId/todos', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

  const rows = (Array.isArray(memory.todos) ? memory.todos : [])
    .filter((t) => t && typeof t === 'object')
    .filter((t) => String(t.artist_id || '') === artistId)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  res.json(rows);
});

router.post('/admin/artist/:artistId/todos', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

  const title = req.body && req.body.title ? String(req.body.title).trim() : '';
  const due_date = req.body && req.body.due_date ? String(req.body.due_date) : null;
  if (!title) return res.status(400).json({ error: 'title é obrigatório' });

  const todo = {
    id: randomUUID(),
    artist_id: artistId,
    title,
    due_date: due_date || null,
    status: 'pendente',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memory.todos.unshift(todo);
  res.status(201).json(todo);
});

router.post('/admin/todos/:id/status', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const status = req.body && req.body.status ? String(req.body.status).trim() : '';
  if (!status) return res.status(400).json({ error: 'status é obrigatório' });

  const idx = (Array.isArray(memory.todos) ? memory.todos : []).findIndex((t) => t && typeof t === 'object' && String(t.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Tarefa não encontrada' });

  const next = { ...memory.todos[idx], status, updated_at: new Date().toISOString() };
  memory.todos[idx] = next;
  res.json(next);
});

router.get('/admin/sellers', authRequired, async (req, res, next) => {
  try {
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

    const rows = await listProfiles(pool, { cargo: 'Vendedor', limit: 500 });
    res.set('Cache-Control', 'no-store');
    res.json(rows);
  } catch (err) {
    if (isMissingTableError(err)) {
      res.set('Cache-Control', 'no-store');
      return res.json([]);
    }
    next(err);
  }
});

router.get('/admin/sellers/:sellerId/goals', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const sellerId = req.params && req.params.sellerId ? String(req.params.sellerId) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(400).json({ error: 'sellerId inválido' });

  const rows = (Array.isArray(memory.sellerGoals) ? memory.sellerGoals : [])
    .filter((g) => g && typeof g === 'object')
    .filter((g) => String(g.seller_id || '') === sellerId)
    .sort((a, b) => {
      const ak = `${String(a.year || '').padStart(4, '0')}-${String(a.month || '').padStart(2, '0')}`;
      const bk = `${String(b.year || '').padStart(4, '0')}-${String(b.month || '').padStart(2, '0')}`;
      return bk.localeCompare(ak);
    });

  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.post('/admin/sellers/:sellerId/goals', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const sellerId = req.params && req.params.sellerId ? String(req.params.sellerId) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(400).json({ error: 'sellerId inválido' });

  const month = Number(req.body && req.body.month ? req.body.month : 0) || 0;
  const year = Number(req.body && req.body.year ? req.body.year : 0) || 0;
  const shows_target = Number(req.body && req.body.shows_target ? req.body.shows_target : 0) || 0;
  const revenue_target = Number(req.body && req.body.revenue_target ? req.body.revenue_target : 0) || 0;

  if (month < 1 || month > 12) return res.status(400).json({ error: 'month inválido' });
  if (year < 2000 || year > 2100) return res.status(400).json({ error: 'year inválido' });

  const store = Array.isArray(memory.sellerGoals) ? memory.sellerGoals : (memory.sellerGoals = []);
  const idx = store.findIndex((g) => g && typeof g === 'object' && String(g.seller_id || '') === sellerId && Number(g.month || 0) === month && Number(g.year || 0) === year);
  const now = new Date().toISOString();

  if (idx >= 0) {
    const next = { ...store[idx], shows_target, revenue_target, updated_at: now };
    store[idx] = next;
    res.status(200).json(next);
    return;
  }

  const row = {
    id: randomUUID(),
    seller_id: sellerId,
    month,
    year,
    shows_target,
    revenue_target,
    created_at: now,
    updated_at: now,
  };
  store.unshift(row);
  res.status(201).json(row);
});

router.get('/admin/sellers/:sellerId/commissions', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const sellerId = req.params && req.params.sellerId ? String(req.params.sellerId) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(400).json({ error: 'sellerId inválido' });

  const rows = (Array.isArray(memory.sellerCommissions) ? memory.sellerCommissions : [])
    .filter((c) => c && typeof c === 'object')
    .filter((c) => String(c.seller_id || '') === sellerId)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 5000);

  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.get('/admin/sellers/:sellerId/leads', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const sellerId = req.params && req.params.sellerId ? String(req.params.sellerId) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(400).json({ error: 'sellerId inválido' });

  const rows = (Array.isArray(memory.sellerLeads) ? memory.sellerLeads : [])
    .filter((l) => l && typeof l === 'object')
    .filter((l) => String(l.seller_id || '') === sellerId)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 2000);

  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.patch('/admin/commissions/:id/status', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });

  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const status = req.body && req.body.status ? String(req.body.status).trim() : '';
  if (!status) return res.status(400).json({ error: 'status é obrigatório' });

  const store = Array.isArray(memory.sellerCommissions) ? memory.sellerCommissions : (memory.sellerCommissions = []);
  const idx = store.findIndex((c) => c && typeof c === 'object' && String(c.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Comissão não encontrada' });

  const prev = store[idx];
  const next = { ...prev, status, updated_at: new Date().toISOString() };
  store[idx] = next;
  res.json(next);
});

router.get('/users', authRequired, async (req, res, next) => {
  try {
    const rawRole = req.query && req.query.role ? String(req.query.role).trim().toLowerCase() : '';
    const cargo = rawRole ? (roleMap[rawRole] || null) : null;
    const rows = await listProfiles(pool, { cargo });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/posts', authRequired, async (req, res, next) => {
  try {
    const userId = req.params && req.params.id ? String(req.params.id) : '';
    if (!userId || !isUuidLike(userId)) return res.status(400).json({ error: 'id inválido' });
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    const requesterId = req.user && req.user.id ? String(req.user.id) : '';
    const canReadOther = cargo === 'Produtor';
    if (!canReadOther && requesterId !== userId) return res.status(403).json({ error: 'Sem permissão' });

    const { rows } = await pool.query(
      `SELECT id, user_id, media_url, media_type, caption, link_url, created_at
       FROM public.posts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/posts', authRequired, async (req, res, next) => {
  try {
    const requesterId = req.user && req.user.id ? String(req.user.id) : '';
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    const canCreateForOther = cargo === 'Produtor';

    const user_id = req.body && req.body.user_id ? String(req.body.user_id) : requesterId;
    const media_url = req.body && req.body.media_url ? String(req.body.media_url) : '';
    const media_type = req.body && (req.body.media_type ?? req.body.type) ? String(req.body.media_type ?? req.body.type) : '';
    const caption = req.body && req.body.caption ? String(req.body.caption) : '';
    const link_url = req.body && req.body.link_url ? String(req.body.link_url) : '';

    if (!user_id || !isUuidLike(user_id)) return res.status(400).json({ error: 'user_id inválido' });
    if (!canCreateForOther && user_id !== requesterId) return res.status(403).json({ error: 'Sem permissão' });
    if (!media_url) return res.status(400).json({ error: 'media_url é obrigatório' });
    if (!media_type || (media_type !== 'image' && media_type !== 'video')) {
      return res.status(400).json({ error: 'media_type inválido' });
    }

    const { rows } = await pool.query(
      `INSERT INTO public.posts
        (id, user_id, media_url, media_type, caption, link_url)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id, user_id, media_url, media_type, caption, link_url, created_at`,
      [user_id, media_url, media_type, caption || null, link_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:id', authRequired, async (req, res, next) => {
  try {
    const postId = req.params && req.params.id ? String(req.params.id) : '';
    if (!postId || !isUuidLike(postId)) return res.status(400).json({ error: 'id inválido' });

    const { rows } = await pool.query(
      'SELECT id, user_id FROM public.posts WHERE id = $1 LIMIT 1',
      [postId]
    );
    const post = rows[0] || null;
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });

    const requesterId = req.user && req.user.id ? String(req.user.id) : '';
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    const canDeleteOther = cargo === 'Produtor';
    if (!canDeleteOther && String(post.user_id) !== requesterId) return res.status(403).json({ error: 'Sem permissão' });

    await pool.query('DELETE FROM public.posts WHERE id = $1', [postId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/quota', authRequired, async (req, res, next) => {
  try {
    const id = req.params && req.params.id ? String(req.params.id) : '';
    if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

    const requesterId = req.user && req.user.id ? String(req.user.id) : '';
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    const canReadOther = cargo === 'Produtor';
    if (!canReadOther && requesterId !== id) return res.status(403).json({ error: 'Sem permissão' });

    const prof = await getProfileById(pool, id);
    if (!prof) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json({
      id: prof.id,
      plano: prof.plano ?? 'Sem Plano',
      bonus_quota: prof.bonus_quota ?? 0,
      plan_started_at: prof.plan_started_at ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/music-count', authRequired, (req, res) => {
  const userId = req.params && req.params.id ? String(req.params.id) : '';
  if (!userId || !isUuidLike(userId)) return res.status(400).json({ error: 'id inválido' });

  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const canReadOther = cargo === 'Produtor';
  if (!canReadOther && requesterId !== userId) return res.status(403).json({ error: 'Sem permissão' });

  const startRaw = req.query && req.query.start ? String(req.query.start) : '';
  const endRaw = req.query && req.query.end ? String(req.query.end) : '';
  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;
  const hasStart = start && !Number.isNaN(start.getTime());
  const hasEnd = end && !Number.isNaN(end.getTime());

  const count = (Array.isArray(memory.musics) ? memory.musics : [])
    .filter((m) => m && typeof m === 'object')
    .filter((m) => {
      const owner = String(m.artista_id ?? m.artist_id ?? '');
      if (owner !== userId) return false;
      const createdAt = m.created_at ? new Date(String(m.created_at)) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return true;
      if (hasStart && createdAt < start) return false;
      if (hasEnd && createdAt > end) return false;
      return true;
    })
    .length;

  res.json(count);
});

router.get('/admins', authRequired, async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Produtor' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/artists', authRequired, async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Artista' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/artists-for-seller', authRequired, async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Artista' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/seller/dashboard', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const goalsStore = Array.isArray(memory.sellerGoals) ? memory.sellerGoals : [];
  const goalForMonth = goalsStore.find((g) =>
    g &&
    typeof g === 'object' &&
    String(g.seller_id || '') === sellerId &&
    Number(g.month || 0) === month &&
    Number(g.year || 0) === year
  );
  const latestGoal = goalsStore
    .filter((g) => g && typeof g === 'object' && String(g.seller_id || '') === sellerId)
    .sort((a, b) => {
      const ak = `${String(a.year || '').padStart(4, '0')}-${String(a.month || '').padStart(2, '0')}`;
      const bk = `${String(b.year || '').padStart(4, '0')}-${String(b.month || '').padStart(2, '0')}`;
      return bk.localeCompare(ak);
    })[0];

  const g = goalForMonth || latestGoal || null;
  const shows_target = Number(g && g.shows_target ? g.shows_target : 0) || 0;
  const revenue_target = Number(g && g.revenue_target ? g.revenue_target : 0) || 0;

  const leadsStore = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : [];
  const closedThisMonth = leadsStore
    .filter((l) => l && typeof l === 'object')
    .filter((l) => String(l.seller_id || '') === sellerId)
    .filter((l) => String(l.status || '') === 'fechado')
    .filter((l) => {
      const dRaw = l.event_date || l.date || l.created_at;
      const d = dRaw ? new Date(String(dRaw)) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

  const current_shows = closedThisMonth.length;
  const current_revenue = closedThisMonth.reduce((acc, l) => acc + (Number(l.budget || l.value || 0) || 0), 0);

  res.set('Cache-Control', 'no-store');
  res.json({
    month,
    year,
    shows_target,
    revenue_target,
    current_shows,
    current_revenue,
  });
});

router.get('/seller/contractors', authRequired, async (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  res.set('Cache-Control', 'no-store');
  res.json(Array.isArray(memory.contractors) ? memory.contractors : []);
});

router.get('/seller/leads', authRequired, async (req, res, next) => {
  try {
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
    const sellerId = req.user && req.user.id ? String(req.user.id) : '';
    if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });

    const store = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : [];
    const rows = store
      .filter((l) => l && typeof l === 'object')
      .filter((l) => String(l.seller_id || '') === sellerId)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 5000);

    const artistIds = Array.from(new Set(rows.map((l) => String(l.artist_id || '')).filter((id) => id && isUuidLike(id))));
    const artistsById = {};
    await Promise.all(
      artistIds.map(async (id) => {
        try {
          const p = await getProfileById(pool, id);
          if (p) artistsById[id] = p;
        } catch { void 0; }
      })
    );

    res.set('Cache-Control', 'no-store');
    res.json(
      rows.map((l) => {
        const artist = artistsById[String(l.artist_id)] || null;
        return {
          ...l,
          artist: artist
            ? {
              id: artist.id,
              nome: artist.nome || artist.nome_completo_razao_social,
              nome_completo_razao_social: artist.nome_completo_razao_social,
              celular: artist.celular,
              avatar_url: artist.avatar_url,
            }
            : null,
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/seller/leads', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });

  const artist_id = req.body && req.body.artist_id ? String(req.body.artist_id) : '';
  if (!artist_id || !isUuidLike(artist_id)) return res.status(400).json({ error: 'artist_id inválido' });
  const contractor_name = req.body && req.body.contractor_name ? String(req.body.contractor_name).trim() : '';
  const event_name = req.body && req.body.event_name ? String(req.body.event_name).trim() : '';
  const city = req.body && req.body.city ? String(req.body.city).trim() : '';
  const event_date = req.body && req.body.event_date ? String(req.body.event_date).trim() : '';
  const budget = Number(req.body && req.body.budget ? req.body.budget : 0) || 0;
  const status = req.body && req.body.status ? String(req.body.status).trim() : 'novo';
  const whatsapp = req.body && req.body.whatsapp ? String(req.body.whatsapp).trim() : '';
  const contractor_id = req.body && req.body.contractor_id ? String(req.body.contractor_id) : null;

  if (!contractor_name) return res.status(400).json({ error: 'contractor_name é obrigatório' });
  if (!event_name) return res.status(400).json({ error: 'event_name é obrigatório' });

  const now = new Date().toISOString();
  const lead = {
    id: randomUUID(),
    seller_id: sellerId,
    artist_id,
    contractor_id: contractor_id && isUuidLike(contractor_id) ? contractor_id : null,
    contractor_name,
    event_name,
    city,
    event_date: event_date || null,
    budget,
    status: status || 'novo',
    whatsapp: whatsapp || null,
    created_at: now,
    updated_at: now,
  };

  const store = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : (memory.sellerLeads = []);
  store.unshift(lead);
  res.status(201).json(lead);
});

router.put('/seller/leads/:id', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : (memory.sellerLeads = []);
  const idx = store.findIndex((l) => l && typeof l === 'object' && String(l.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Lead não encontrado' });
  const prev = store[idx];
  if (String(prev.seller_id || '') !== sellerId) return res.status(403).json({ error: 'Sem permissão' });

  const patch = (req.body && typeof req.body === 'object') ? req.body : {};
  const next = {
    ...prev,
    contractor_name: patch.contractor_name !== undefined ? String(patch.contractor_name).trim() : prev.contractor_name,
    event_name: patch.event_name !== undefined ? String(patch.event_name).trim() : prev.event_name,
    city: patch.city !== undefined ? String(patch.city).trim() : prev.city,
    event_date: patch.event_date !== undefined ? (patch.event_date ? String(patch.event_date).trim() : null) : prev.event_date,
    budget: patch.budget !== undefined ? (Number(patch.budget) || 0) : prev.budget,
    status: patch.status !== undefined ? String(patch.status).trim() : prev.status,
    whatsapp: patch.whatsapp !== undefined ? (patch.whatsapp ? String(patch.whatsapp).trim() : null) : prev.whatsapp,
    contractor_id: patch.contractor_id !== undefined ? (patch.contractor_id && isUuidLike(patch.contractor_id) ? String(patch.contractor_id) : null) : prev.contractor_id,
    artist_id: patch.artist_id !== undefined ? String(patch.artist_id) : prev.artist_id,
    updated_at: new Date().toISOString(),
  };

  if (!next.artist_id || !isUuidLike(next.artist_id)) return res.status(400).json({ error: 'artist_id inválido' });
  if (!next.contractor_name) return res.status(400).json({ error: 'contractor_name é obrigatório' });
  if (!next.event_name) return res.status(400).json({ error: 'event_name é obrigatório' });

  store[idx] = next;
  res.json(next);
});

router.delete('/seller/leads/:id', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : (memory.sellerLeads = []);
  const prev = store.find((l) => l && typeof l === 'object' && String(l.id || '') === id) || null;
  if (!prev) return res.status(404).json({ error: 'Lead não encontrado' });
  if (String(prev.seller_id || '') !== sellerId) return res.status(403).json({ error: 'Sem permissão' });

  memory.sellerLeads = store.filter((l) => String(l.id || '') !== id);
  if (memory.sellerLeadHistory instanceof Map) memory.sellerLeadHistory.delete(id);
  res.json({ ok: true });
});

router.get('/seller/leads/:id/history', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : [];
  const lead = store.find((l) => l && typeof l === 'object' && String(l.id || '') === id) || null;
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  if (String(lead.seller_id || '') !== sellerId) return res.status(403).json({ error: 'Sem permissão' });

  const history = (memory.sellerLeadHistory instanceof Map) ? (memory.sellerLeadHistory.get(id) || []) : [];
  res.set('Cache-Control', 'no-store');
  res.json(history);
});

router.post('/seller/leads/:id/history', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : [];
  const lead = store.find((l) => l && typeof l === 'object' && String(l.id || '') === id) || null;
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  if (String(lead.seller_id || '') !== sellerId) return res.status(403).json({ error: 'Sem permissão' });

  const notes = req.body && req.body.notes ? String(req.body.notes) : '';
  if (!notes.trim()) return res.status(400).json({ error: 'notes é obrigatório' });
  if (!(memory.sellerLeadHistory instanceof Map)) memory.sellerLeadHistory = new Map();
  const prev = memory.sellerLeadHistory.get(id) || [];
  const row = { id: randomUUID(), lead_id: id, notes: notes.trim(), created_at: new Date().toISOString() };
  memory.sellerLeadHistory.set(id, [...prev, row].slice(-500));
  res.status(201).json(row);
});

router.post('/seller/leads/:id/sync-agenda', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const leadId = req.params && req.params.id ? String(req.params.id) : '';
  if (!leadId || !isUuidLike(leadId)) return res.status(400).json({ error: 'id inválido' });

  const status = req.body && req.body.status ? String(req.body.status).trim() : '';
  const artistId = req.body && req.body.artist_id ? String(req.body.artist_id) : '';
  const eventName = req.body && req.body.event_name ? String(req.body.event_name) : '';
  const eventDate = req.body && req.body.event_date ? String(req.body.event_date) : '';
  const contractorName = req.body && req.body.contractor_name ? String(req.body.contractor_name) : '';
  const budget = Number(req.body && req.body.budget ? req.body.budget : 0) || 0;
  const city = req.body && req.body.city ? String(req.body.city) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artist_id inválido' });

  const events = Array.isArray(memory.sellerArtistEvents) ? memory.sellerArtistEvents : (memory.sellerArtistEvents = []);
  const idx = events.findIndex((e) => e && typeof e === 'object' && e.metadata && String(e.metadata.lead_id || '') === leadId);

  if (status === 'perdido' || status === 'cancelado') {
    if (idx >= 0) events.splice(idx, 1);
    return res.json({ ok: true, action: 'deleted' });
  }

  const title = eventName ? String(eventName) : 'Show';
  const notes = [contractorName ? `Cliente: ${contractorName}` : null, city ? `Cidade: ${city}` : null, budget ? `Valor: ${budget}` : null].filter(Boolean).join(' | ');
  const row = {
    id: idx >= 0 ? events[idx].id : randomUUID(),
    artista_id: artistId,
    seller_id: sellerId,
    title,
    date: eventDate || null,
    type: 'show',
    notes,
    created_at: idx >= 0 ? events[idx].created_at : new Date().toISOString(),
    metadata: { lead_id: leadId },
  };

  if (idx >= 0) events[idx] = { ...events[idx], ...row };
  else events.unshift(row);

  res.json({ ok: true, action: idx >= 0 ? 'updated' : 'created' });
});

router.get('/seller/calendar', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const month = req.query && req.query.month ? String(req.query.month) : '';
  if (month && !isValidMonth(month)) return res.status(400).json({ error: 'month inválido' });

  const store = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : [];
  const rows = store
    .filter((l) => l && typeof l === 'object')
    .filter((l) => String(l.seller_id || '') === sellerId)
    .filter((l) => l.event_date)
    .filter((l) => {
      if (!month) return true;
      const d = new Date(String(l.event_date));
      if (Number.isNaN(d.getTime())) return false;
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return m === month;
    })
    .filter((l) => {
      const s = String(l.status || '');
      return s !== 'perdido' && s !== 'cancelado';
    })
    .sort((a, b) => String(a.event_date || '').localeCompare(String(b.event_date || '')));

  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

router.get('/seller/proposals', authRequired, async (req, res, next) => {
  try {
    const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
    const sellerId = req.user && req.user.id ? String(req.user.id) : '';
    if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });

    const store = Array.isArray(memory.sellerProposals) ? memory.sellerProposals : [];
    const rows = store
      .filter((p) => p && typeof p === 'object')
      .filter((p) => String(p.seller_id || '') === sellerId)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 2000);

    const leadStore = Array.isArray(memory.sellerLeads) ? memory.sellerLeads : [];
    const leadsById = {};
    for (const l of leadStore) {
      if (l && typeof l === 'object' && l.id) leadsById[String(l.id)] = l;
    }

    const artistIds = Array.from(new Set(rows.map((p) => String(p.artist_id || '')).filter((id) => id && isUuidLike(id))));
    const artistsById = {};
    await Promise.all(
      artistIds.map(async (id) => {
        try {
          const p = await getProfileById(pool, id);
          if (p) artistsById[id] = p;
        } catch { void 0; }
      })
    );

    res.set('Cache-Control', 'no-store');
    res.json(
      rows.map((p) => {
        const lead = p.lead_id ? (leadsById[String(p.lead_id)] || null) : null;
        const artist = p.artist_id ? (artistsById[String(p.artist_id)] || null) : null;
        return {
          ...p,
          leads: lead,
          artist: artist ? { id: artist.id, nome: artist.nome || artist.nome_completo_razao_social, avatar_url: artist.avatar_url } : null,
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/seller/proposals', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });

  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const lead_id = payload.lead_id && isUuidLike(payload.lead_id) ? String(payload.lead_id) : null;
  const client_name = payload.client_name ? String(payload.client_name).trim() : '';
  const title = payload.title ? String(payload.title).trim() : '';
  const artist_id = payload.artist_id && isUuidLike(payload.artist_id) ? String(payload.artist_id) : null;
  const value = Number(payload.value || 0) || 0;
  const status = payload.status ? String(payload.status).trim() : 'rascunho';
  const file_url = payload.file_url ? String(payload.file_url) : null;
  const observations = payload.observations ? String(payload.observations) : '';

  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    seller_id: sellerId,
    lead_id,
    client_name,
    title,
    artist_id,
    value,
    status,
    file_url,
    observations,
    created_at: now,
    updated_at: now,
  };

  const store = Array.isArray(memory.sellerProposals) ? memory.sellerProposals : (memory.sellerProposals = []);
  store.unshift(row);
  res.status(201).json(row);
});

router.put('/seller/proposals/:id', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sellerProposals) ? memory.sellerProposals : (memory.sellerProposals = []);
  const idx = store.findIndex((p) => p && typeof p === 'object' && String(p.id || '') === id);
  if (idx < 0) return res.status(404).json({ error: 'Proposta não encontrada' });
  const prev = store[idx];
  if (String(prev.seller_id || '') !== sellerId) return res.status(403).json({ error: 'Sem permissão' });

  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const next = {
    ...prev,
    lead_id: payload.lead_id !== undefined ? (payload.lead_id && isUuidLike(payload.lead_id) ? String(payload.lead_id) : null) : prev.lead_id,
    client_name: payload.client_name !== undefined ? String(payload.client_name || '').trim() : prev.client_name,
    title: payload.title !== undefined ? String(payload.title || '').trim() : prev.title,
    artist_id: payload.artist_id !== undefined ? (payload.artist_id && isUuidLike(payload.artist_id) ? String(payload.artist_id) : null) : prev.artist_id,
    value: payload.value !== undefined ? (Number(payload.value || 0) || 0) : prev.value,
    status: payload.status !== undefined ? String(payload.status || '').trim() : prev.status,
    file_url: payload.file_url !== undefined ? (payload.file_url ? String(payload.file_url) : null) : prev.file_url,
    observations: payload.observations !== undefined ? String(payload.observations || '') : prev.observations,
    updated_at: new Date().toISOString(),
  };

  store[idx] = next;
  res.json(next);
});

router.delete('/seller/proposals/:id', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  if (cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  const sellerId = req.user && req.user.id ? String(req.user.id) : '';
  if (!sellerId || !isUuidLike(sellerId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

  const store = Array.isArray(memory.sellerProposals) ? memory.sellerProposals : (memory.sellerProposals = []);
  const prev = store.find((p) => p && typeof p === 'object' && String(p.id || '') === id) || null;
  if (!prev) return res.status(404).json({ error: 'Proposta não encontrada' });
  if (String(prev.seller_id || '') !== sellerId) return res.status(403).json({ error: 'Sem permissão' });

  memory.sellerProposals = store.filter((p) => String(p.id || '') !== id);
  res.json({ ok: true });
});

router.get('/seller/artists', authRequired, async (req, res, next) => {
  try {
    if (!isSellerOrAdmin(req)) return res.status(403).json({ error: 'Sem permissão' });
    const rows = await listProfiles(pool, { cargo: 'Artista' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/seller/artists/:artistId/events', authRequired, (req, res) => {
  if (!isSellerOrAdmin(req)) return res.status(403).json({ error: 'Sem permissão' });
  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });
  const month = req.query && req.query.month ? String(req.query.month) : '';
  if (month && !isValidMonth(month)) return res.status(400).json({ error: 'month inválido' });

  const rows = (Array.isArray(memory.sellerArtistEvents) ? memory.sellerArtistEvents : [])
    .filter((e) => e && typeof e === 'object')
    .filter((e) => String(e.artista_id || '') === artistId)
    .filter((e) => (month ? getMonthPrefix(e.date) === month : true))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  res.json(rows);
});

router.get('/seller/artist-events', authRequired, (req, res) => {
  if (!isSellerOrAdmin(req)) return res.status(403).json({ error: 'Sem permissão' });
  const artistId = req.query && (req.query.artist_id || req.query.artista_id) ? String(req.query.artist_id || req.query.artista_id) : '';
  if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artist_id inválido' });
  const month = req.query && req.query.month ? String(req.query.month) : '';
  if (month && !isValidMonth(month)) return res.status(400).json({ error: 'month inválido' });

  const rows = (Array.isArray(memory.sellerArtistEvents) ? memory.sellerArtistEvents : [])
    .filter((e) => e && typeof e === 'object')
    .filter((e) => String(e.artista_id || '') === artistId)
    .filter((e) => (month ? getMonthPrefix(e.date) === month : true))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  res.json(rows);
});

router.post('/seller/artist-events', authRequired, (req, res) => {
  if (!isSellerOrAdmin(req)) return res.status(403).json({ error: 'Sem permissão' });
  const artistaId = req.body && (req.body.artista_id || req.body.artist_id) ? String(req.body.artista_id || req.body.artist_id) : '';
  if (!artistaId || !isUuidLike(artistaId)) return res.status(400).json({ error: 'artista_id inválido' });
  const title = req.body && req.body.title ? String(req.body.title).trim() : '';
  const date = req.body && req.body.date ? String(req.body.date).trim() : '';
  const type = req.body && req.body.type ? String(req.body.type).trim() : '';
  const notes = req.body && req.body.notes ? String(req.body.notes) : '';
  if (!title || !date) return res.status(400).json({ error: 'title e date são obrigatórios' });

  const event = {
    id: randomUUID(),
    artista_id: artistaId,
    seller_id: req.user && req.user.id ? String(req.user.id) : null,
    title,
    date,
    type: type || 'show',
    notes,
    created_at: new Date().toISOString(),
  };
  memory.sellerArtistEvents.unshift(event);
  res.status(201).json(event);
});

router.get('/songs/mine', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  if (!userId || !isUuidLike(userId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const rows = (Array.isArray(memory.musics) ? memory.musics : [])
    .filter((m) => m && typeof m === 'object')
    .filter((m) => String(m.artista_id ?? m.artist_id ?? '') === userId)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  res.json(rows);
});

router.get('/songs/external-metrics', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  if (!userId || !isUuidLike(userId)) return res.status(401).json({ error: 'Autenticação necessária' });

  const myMusicIds = new Set(
    (Array.isArray(memory.musics) ? memory.musics : [])
      .filter((m) => m && typeof m === 'object')
      .filter((m) => String(m.artista_id ?? m.artist_id ?? '') === userId)
      .map((m) => String(m.id || ''))
      .filter(Boolean)
  );

  const latestByMusic = new Map();
  (Array.isArray(memory.musicExternalMetrics) ? memory.musicExternalMetrics : [])
    .filter((em) => em && typeof em === 'object')
    .filter((em) => myMusicIds.has(String(em.music_id || '')))
    .forEach((em) => {
      const mid = String(em.music_id || '');
      const prev = latestByMusic.get(mid);
      const prevAt = prev && prev.updated_at ? String(prev.updated_at) : '';
      const nextAt = em.updated_at ? String(em.updated_at) : '';
      if (!prev || nextAt >= prevAt) latestByMusic.set(mid, em);
    });

  res.json(Array.from(latestByMusic.values()));
});

router.get('/musics/:musicId/external-metrics', authRequired, (req, res) => {
  const musicId = req.params && req.params.musicId ? String(req.params.musicId) : '';
  if (!musicId || !isUuidLike(musicId)) return res.status(400).json({ error: 'musicId inválido' });

  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const canEditOther = cargo === 'Produtor';

  const music = (Array.isArray(memory.musics) ? memory.musics : []).find((m) => m && typeof m === 'object' && String(m.id || '') === musicId) || null;
  if (music) {
    const owner = String(music.artista_id ?? music.artist_id ?? '');
    if (!canEditOther && owner && owner !== requesterId) return res.status(403).json({ error: 'Sem permissão' });
  } else if (!canEditOther) {
    return res.status(404).json({ error: 'Música não encontrada' });
  }

  const source = req.query && req.query.source ? String(req.query.source) : '';
  const rows = (Array.isArray(memory.musicExternalMetrics) ? memory.musicExternalMetrics : [])
    .filter((em) => em && typeof em === 'object')
    .filter((em) => String(em.music_id || '') === musicId)
    .filter((em) => (source ? String(em.source || '') === source : true))
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));

  res.json(rows[0] || { music_id: musicId, source: source || 'manual', plays: 0, listeners: 0, revenue: 0, updated_at: null });
});

router.post('/musics/:musicId/external-metrics', authRequired, (req, res) => {
  const musicId = req.params && req.params.musicId ? String(req.params.musicId) : '';
  if (!musicId || !isUuidLike(musicId)) return res.status(400).json({ error: 'musicId inválido' });

  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const canEditOther = cargo === 'Produtor';

  const music = (Array.isArray(memory.musics) ? memory.musics : []).find((m) => m && typeof m === 'object' && String(m.id || '') === musicId) || null;
  if (music) {
    const owner = String(music.artista_id ?? music.artist_id ?? '');
    if (!canEditOther && owner && owner !== requesterId) return res.status(403).json({ error: 'Sem permissão' });
  } else if (!canEditOther) {
    return res.status(404).json({ error: 'Música não encontrada' });
  }

  const source = req.body && req.body.source ? String(req.body.source) : 'manual';
  const plays = Number(req.body && req.body.plays ? req.body.plays : 0) || 0;
  const listeners = Number(req.body && req.body.listeners ? req.body.listeners : 0) || 0;
  const revenue = Number(req.body && req.body.revenue ? req.body.revenue : 0) || 0;
  const updated_at = new Date().toISOString();

  const row = { id: randomUUID(), music_id: musicId, source, plays, listeners, revenue, updated_at };
  memory.musicExternalMetrics.unshift(row);
  res.status(201).json(row);
});

router.post('/musics/batch', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const canCreateForOther = cargo === 'Produtor';

  const musics = req.body && Array.isArray(req.body.musics) ? req.body.musics : null;
  if (!musics || musics.length === 0) return res.status(400).json({ error: 'musics é obrigatório' });
  if (musics.length > 100) return res.status(413).json({ error: 'Muitas músicas' });

  const created = [];
  for (const m of musics) {
    const body = m && typeof m === 'object' ? m : null;
    if (!body) continue;
    const artista_id = body.artista_id ? String(body.artista_id) : '';
    if (!artista_id || !isUuidLike(artista_id)) return res.status(400).json({ error: 'artista_id inválido' });
    if (!canCreateForOther && artista_id !== requesterId) return res.status(403).json({ error: 'Sem permissão' });

    const music = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...body,
      artista_id,
    };
    memory.musics.unshift(music);
    created.push(music);
  }

  res.status(201).json(created);
});

router.post('/musics', authRequired, (req, res) => {
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
  const requesterId = req.user && req.user.id ? String(req.user.id) : '';
  if (!requesterId || !isUuidLike(requesterId)) return res.status(401).json({ error: 'Autenticação necessária' });
  const canCreateForOther = cargo === 'Produtor';

  const artista_id = req.body && req.body.artista_id ? String(req.body.artista_id) : requesterId;
  if (!artista_id || !isUuidLike(artista_id)) return res.status(400).json({ error: 'artista_id inválido' });
  if (!canCreateForOther && artista_id !== requesterId) return res.status(403).json({ error: 'Sem permissão' });

  const titulo = req.body && (req.body.titulo ?? req.body.title) ? String(req.body.titulo ?? req.body.title).trim() : '';
  const audio_url = req.body && req.body.audio_url ? String(req.body.audio_url) : '';
  const cover_url = req.body && req.body.cover_url ? String(req.body.cover_url) : '';
  if (!titulo) return res.status(400).json({ error: 'titulo é obrigatório' });
  if (!audio_url) return res.status(400).json({ error: 'audio_url é obrigatório' });
  if (!cover_url) return res.status(400).json({ error: 'cover_url é obrigatório' });

  const music = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...((req.body && typeof req.body === 'object') ? req.body : {}),
    artista_id,
    titulo,
  };
  memory.musics.unshift(music);
  res.status(201).json(music);
});

router.get('/producer-projects', authRequired, async (req, res, next) => {
  try {
    const producerId = req.user && req.user.id ? String(req.user.id) : '';
    if (!producerId || !isUuidLike(producerId)) return res.status(401).json({ error: 'Autenticação necessária' });

    const { rows } = await pool.query(
      `SELECT id, producer_id, title, url, platform, published, created_at
       FROM public.producer_projects
       WHERE producer_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [producerId]
    );
    res.set('Cache-Control', 'no-store');
    res.json(rows);
  } catch (err) {
    if (isMissingTableError(err)) {
      const rows = (Array.isArray(memory.producerProjects) ? memory.producerProjects : [])
        .filter((p) => p && typeof p === 'object' && String(p.producer_id) === String(req.user.id))
        .slice(0, 200);
      res.set('Cache-Control', 'no-store');
      return res.json(rows);
    }
    next(err);
  }
});

router.post('/producer-projects', authRequired, async (req, res, next) => {
  try {
    const producerId = req.user && req.user.id ? String(req.user.id) : '';
    if (!producerId || !isUuidLike(producerId)) return res.status(401).json({ error: 'Autenticação necessária' });

    const title = req.body && req.body.title ? String(req.body.title).trim() : '';
    const url = req.body && req.body.url ? String(req.body.url).trim() : '';
    const platform = req.body && req.body.platform ? String(req.body.platform).trim() : '';
    const published = req.body && typeof req.body.published === 'boolean' ? req.body.published : true;

    if (!title || !url || !platform) {
      return res.status(400).json({ error: 'title, url e platform são obrigatórios' });
    }

    const { rows } = await pool.query(
      `INSERT INTO public.producer_projects
        (id, producer_id, title, url, platform, published)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id, producer_id, title, url, platform, published, created_at`,
      [producerId, title, url, platform, published]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (isMissingTableError(err)) {
      const project = {
        id: randomUUID(),
        producer_id: String(req.user.id),
        title: req.body && req.body.title ? String(req.body.title).trim() : '',
        url: req.body && req.body.url ? String(req.body.url).trim() : '',
        platform: req.body && req.body.platform ? String(req.body.platform).trim() : '',
        published: req.body && typeof req.body.published === 'boolean' ? req.body.published : true,
        created_at: new Date().toISOString(),
      };
      if (!project.title || !project.url || !project.platform) {
        return res.status(400).json({ error: 'title, url e platform são obrigatórios' });
      }
      memory.producerProjects.unshift(project);
      return res.status(201).json(project);
    }
    next(err);
  }
});

router.delete('/producer-projects/:id', authRequired, async (req, res, next) => {
  try {
    const producerId = req.user && req.user.id ? String(req.user.id) : '';
    if (!producerId || !isUuidLike(producerId)) return res.status(401).json({ error: 'Autenticação necessária' });

    const id = req.params && req.params.id ? String(req.params.id) : '';
    if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });

    const { rows } = await pool.query(
      `SELECT id, producer_id
       FROM public.producer_projects
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    const project = rows[0] || null;
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
    if (String(project.producer_id) !== producerId) return res.status(403).json({ error: 'Sem permissão' });

    await pool.query('DELETE FROM public.producer_projects WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    if (isMissingTableError(err)) {
      const producerId = req.user && req.user.id ? String(req.user.id) : '';
      const id = req.params && req.params.id ? String(req.params.id) : '';
      const projects = Array.isArray(memory.producerProjects) ? memory.producerProjects : [];
      const project = projects.find((p) => p && typeof p === 'object' && String(p.id) === id) || null;
      if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
      if (String(project.producer_id) !== producerId) return res.status(403).json({ error: 'Sem permissão' });
      memory.producerProjects = projects.filter((p) => !(p && typeof p === 'object' && String(p.id) === id));
      return res.json({ ok: true });
    }
    next(err);
  }
});

router.get('/admin/musics', authRequired, (req, res) => {
  const artistId = req.query && req.query.artist_id ? String(req.query.artist_id) : '';
  const status = req.query && req.query.status ? String(req.query.status) : '';
  const rows = memory.musics.filter((m) => {
    if (artistId && String(m.artist_id ?? m.artista_id ?? '') !== artistId) return false;
    if (status && String(m.status || '') !== status) return false;
    return true;
  });
  res.json(rows);
});

router.post('/admin/musics', authRequired, (req, res) => {
  const artist_id = req.body && req.body.artist_id ? String(req.body.artist_id) : '';
  const title = req.body && (req.body.title ?? req.body.titulo) ? String(req.body.title ?? req.body.titulo) : '';
  const status = req.body && req.body.status ? String(req.body.status) : 'pendente';

  const music = {
    id: randomUUID(),
    artist_id,
    title,
    status,
    created_at: new Date().toISOString(),
    ...((req.body && typeof req.body === 'object') ? req.body : {}),
  };
  memory.musics.unshift(music);
  res.status(201).json(music);
});

router.put('/admin/musics/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const idx = memory.musics.findIndex((m) => String(m.id) === id);
  if (idx < 0) return res.status(404).json({ error: 'Música não encontrada' });
  const current = memory.musics[idx];
  const next = { ...current, ...((req.body && typeof req.body === 'object') ? req.body : {}), id: current.id };
  memory.musics[idx] = next;
  res.json(next);
});

router.delete('/admin/musics/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.musics = memory.musics.filter((m) => String(m.id) !== id);
  res.json({ ok: true });
});

router.get('/notifications', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  const items = memory.notifications.filter((n) => n.recipient_id === userId);
  res.json(items);
});

router.post('/notifications', authRequired, (req, res) => {
  const recipient_id = req.body && (req.body.recipient_id ?? req.body.recipientId) ? String(req.body.recipient_id ?? req.body.recipientId) : '';
  const title = req.body && req.body.title ? String(req.body.title) : '';
  const message = req.body && req.body.message ? String(req.body.message) : '';
  const link = req.body && req.body.link ? String(req.body.link) : null;
  const type = req.body && req.body.type ? String(req.body.type) : null;

  if (!recipient_id || !title || !message) {
    return res.status(400).json({ error: 'recipient_id, title e message são obrigatórios' });
  }

  const n = {
    id: randomUUID(),
    recipient_id,
    title,
    message,
    link,
    type,
    read: false,
    created_at: new Date().toISOString(),
  };
  memory.notifications.unshift(n);
  res.status(201).json(n);
});

router.post('/notifications/read-all', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  memory.notifications = memory.notifications.map((n) => (n.recipient_id === userId ? { ...n, read: true } : n));
  res.json({ ok: true });
});

router.post('/notifications/:id/read', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.notifications = memory.notifications.map((n) => (n.id === id && n.recipient_id === userId ? { ...n, read: true } : n));
  res.json({ ok: true });
});

router.post('/broadcast-notifications', authRequired, (req, res) => {
  const title = req.body && req.body.title ? String(req.body.title) : '';
  const message = req.body && req.body.message ? String(req.body.message) : '';
  const link = req.body && req.body.link ? String(req.body.link) : null;
  const targetRoleRaw = req.body && (req.body.target_role ?? req.body.targetRole) ? String(req.body.target_role ?? req.body.targetRole).trim().toLowerCase() : '';
  const cargo = targetRoleRaw ? (roleMap[targetRoleRaw] || null) : null;

  if (!title || !message) {
    return res.status(400).json({ error: 'title e message são obrigatórios' });
  }

  Promise.resolve()
    .then(async () => {
      const recipients = await listProfiles(pool, { cargo, limit: 500 });
      const nowIso = new Date().toISOString();
      for (const r of recipients) {
        memory.notifications.unshift({
          id: randomUUID(),
          recipient_id: String(r.id),
          title,
          message,
          link,
          type: 'broadcast',
          read: false,
          created_at: nowIso,
        });
      }
      res.json({ ok: true, recipients: recipients.length });
    })
    .catch(() => res.json({ ok: true, recipients: 0 }));
});

router.get('/chat/stream', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
  const cargo = req.user && req.user.cargo ? String(req.user.cargo) : '';

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const cleanup = registerRealtimeClient({ userId, cargo, res });
  const ping = setInterval(() => {
    try {
      if (!res.writableEnded) sseWrite(res, 'ping', { t: Date.now() });
    } catch { void 0; }
  }, 25000);

  try { sseWrite(res, 'connected', { ok: true }); } catch { void 0; }

  req.on('close', () => {
    clearInterval(ping);
    cleanup();
  });
});

router.get('/queue', authRequired, (req, res) => {
  res.json(memory.queue);
});

router.post('/queue', authRequired, (req, res) => {
  const role_needed = req.body && (req.body.role_needed ?? req.body.roleNeeded) ? String(req.body.role_needed ?? req.body.roleNeeded) : null;
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
  const requester_id = req.user && req.user.id ? String(req.user.id) : '';

  const item = {
    id: randomUUID(),
    requester_id,
    role_needed,
    metadata,
    created_at: new Date().toISOString(),
  };
  memory.queue.unshift(item);
  emitRealtimeToUsers([requester_id], 'queue_update', { type: 'created', id: item.id });
  emitRealtimeToRole('Vendedor', 'queue_update', { type: 'created', id: item.id });
  emitRealtimeToRole('Produtor', 'queue_update', { type: 'created', id: item.id });
  res.status(201).json(item);
});

router.delete('/queue/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.queue = memory.queue.filter((q) => q.id !== id);
  emitRealtimeToRole('Vendedor', 'queue_update', { type: 'deleted', id });
  emitRealtimeToRole('Produtor', 'queue_update', { type: 'deleted', id });
  res.json({ ok: true });
});

router.get('/chats', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  const rows = memory.chats.filter((c) => (c.participant_ids || []).map(String).includes(userId));
  res.json(rows);
});

router.post('/chats', authRequired, (req, res) => {
  const participant_ids = Array.isArray(req.body && req.body.participant_ids) ? req.body.participant_ids.map(String) : [];
  const status = req.body && req.body.status ? String(req.body.status) : 'active';
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

  if (participant_ids.length < 2) {
    return res.status(400).json({ error: 'participant_ids inválido' });
  }

  const existing = memory.chats.find((c) => {
    const a = new Set((c.participant_ids || []).map(String));
    const b = new Set(participant_ids.map(String));
    if (a.size !== b.size) return false;
    for (const id of a) if (!b.has(id)) return false;
    return true;
  });
  if (existing) {
    return res.status(409).json({ error: 'Chat já existe', id: existing.id });
  }

  const chat = {
    id: randomUUID(),
    participant_ids,
    participant_names: [],
    participant_avatars: [],
    status,
    assigned_to: null,
    metadata,
    created_at: new Date().toISOString(),
    messages: [],
  };
  memory.chats.unshift(chat);
  emitRealtimeToUsers(participant_ids, 'chat_update', { type: 'chat_created', chat_id: chat.id });
  res.status(201).json(chat);
});

router.put('/chats/:id/status', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const status = req.body && req.body.status ? String(req.body.status) : '';
  memory.chats = memory.chats.map((c) => (c.id === id ? { ...c, status: status || c.status } : c));
  const chat = memory.chats.find((c) => c && c.id === id);
  emitRealtimeToUsers((chat && chat.participant_ids) ? chat.participant_ids : [], 'chat_update', { type: 'chat_status', chat_id: id });
  res.json({ ok: true });
});

router.put('/chats/:id/assign', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const userId = req.user && req.user.id ? String(req.user.id) : null;
  memory.chats = memory.chats.map((c) => (c.id === id ? { ...c, assigned_to: userId } : c));
  const chat = memory.chats.find((c) => c && c.id === id);
  emitRealtimeToUsers((chat && chat.participant_ids) ? chat.participant_ids : [], 'chat_update', { type: 'chat_assigned', chat_id: id });
  res.json({ ok: true });
});

router.put('/chats/:id/mark-read', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.chats = memory.chats.map((c) => {
    if (c.id !== id) return c;
    const messages = (c.messages || []).map((m) => ({ ...m, read: true }));
    return { ...c, messages };
  });
  const chat = memory.chats.find((c) => c && c.id === id);
  emitRealtimeToUsers((chat && chat.participant_ids) ? chat.participant_ids : [], 'chat_update', { type: 'chat_read', chat_id: id });
  res.json({ ok: true });
});

router.delete('/chats/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const prev = memory.chats.find((c) => c && c.id === id);
  memory.chats = memory.chats.filter((c) => c.id !== id);
  emitRealtimeToUsers((prev && prev.participant_ids) ? prev.participant_ids : [], 'chat_update', { type: 'chat_deleted', chat_id: id });
  res.json({ ok: true });
});

router.get('/messages', authRequired, (req, res) => {
  const all = memory.chats.flatMap((c) => c.messages || []);
  res.json(all);
});

router.post('/messages', authRequired, (req, res) => {
  const chat_id = req.body && req.body.chat_id ? String(req.body.chat_id) : null;
  const sender_id = req.body && req.body.sender_id ? String(req.body.sender_id) : (req.user && req.user.id ? String(req.user.id) : null);
  const receiver_id = req.body && req.body.receiver_id ? String(req.body.receiver_id) : null;
  const content = req.body && (req.body.message ?? req.body.content) ? String(req.body.message ?? req.body.content) : '';
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

  if (!receiver_id || !content) {
    return res.status(400).json({ error: 'receiver_id e message são obrigatórios' });
  }

  const msg = {
    id: randomUUID(),
    chat_id,
    sender_id,
    receiver_id,
    content,
    message: content,
    read: false,
    created_at: new Date().toISOString(),
    metadata,
    sender_role: metadata && metadata.sender_cargo ? metadata.sender_cargo : null,
  };

  if (chat_id) {
    const idx = memory.chats.findIndex((c) => c.id === chat_id);
    if (idx >= 0) {
      const chat = memory.chats[idx];
      const messages = Array.isArray(chat.messages) ? chat.messages : [];
      const updated = { ...chat, messages: [...messages, msg] };
      memory.chats[idx] = updated;
    }
  }

  const chat = chat_id ? memory.chats.find((c) => c && c.id === chat_id) : null;
  const participantIds = chat && Array.isArray(chat.participant_ids) ? chat.participant_ids : [];
  const targets = participantIds.length ? participantIds : [sender_id, receiver_id].filter(Boolean);
  emitRealtimeToUsers(targets, 'chat_update', { type: 'message', chat_id: chat_id || null, message_id: msg.id });

  res.status(201).json(msg);
});

router.get('/admin/artist/:artistId/metrics', authRequired, async (req, res, next) => {
  try {
    const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
    if (!artistId || !isUuidLike(artistId)) return res.json({ total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 });
    const { rows } = await pool.query(
      `SELECT total_plays, ouvintes_mensais, receita_estimada
       FROM public.artist_metrics
       WHERE artist_id = $1
       LIMIT 1`,
      [artistId]
    );
    res.json(rows[0] || { total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 });
  } catch (err) {
    if (isMissingTableError(err)) {
      const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
      const fallback = (artistId && isUuidLike(artistId) && memory.artistMetrics instanceof Map)
        ? (memory.artistMetrics.get(artistId) || { total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 })
        : { total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 };
      return res.json(fallback);
    }
    next(err);
  }
});

router.post('/admin/artist/:artistId/metrics', authRequired, async (req, res, next) => {
  try {
    const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
    if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });

    const total_plays = Number(req.body && req.body.total_plays ? req.body.total_plays : 0) || 0;
    const ouvintes_mensais = Number(req.body && req.body.ouvintes_mensais ? req.body.ouvintes_mensais : 0) || 0;
    const receita_estimada = Number(req.body && req.body.receita_estimada ? req.body.receita_estimada : 0) || 0;

    const { rows } = await pool.query(
      `INSERT INTO public.artist_metrics (artist_id, total_plays, ouvintes_mensais, receita_estimada, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (artist_id)
       DO UPDATE SET total_plays = EXCLUDED.total_plays,
                     ouvintes_mensais = EXCLUDED.ouvintes_mensais,
                     receita_estimada = EXCLUDED.receita_estimada,
                     updated_at = now()
       RETURNING total_plays, ouvintes_mensais, receita_estimada, updated_at`,
      [artistId, total_plays, ouvintes_mensais, receita_estimada]
    );

    res.json(rows[0] || { total_plays, ouvintes_mensais, receita_estimada, updated_at: new Date().toISOString() });
  } catch (err) {
    if (isMissingTableError(err)) {
      const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
      if (!artistId || !isUuidLike(artistId)) return res.status(400).json({ error: 'artistId inválido' });
      if (!(memory.artistMetrics instanceof Map)) memory.artistMetrics = new Map();
      const row = { total_plays: Number(req.body?.total_plays || 0) || 0, ouvintes_mensais: Number(req.body?.ouvintes_mensais || 0) || 0, receita_estimada: Number(req.body?.receita_estimada || 0) || 0, updated_at: new Date().toISOString() };
      memory.artistMetrics.set(artistId, row);
      return res.json(row);
    }
    next(err);
  }
});

export default router;
