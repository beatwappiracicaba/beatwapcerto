import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
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
  producerProjects: [],
  musics: [],
  posts: [],
});
if (!Array.isArray(memory.sellerArtistEvents)) memory.sellerArtistEvents = [];
if (!Array.isArray(memory.musicExternalMetrics)) memory.musicExternalMetrics = [];
if (!Array.isArray(memory.todos)) memory.todos = [];

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

function isUuidLike(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
}

function isMissingTableError(err) {
  return !!(err && (err.code === '42P01' || /does not exist/i.test(String(err.message || ''))));
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
    next(err);
  }
});

router.get('/compositions', (req, res) => res.json([]));
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
router.get('/composers', (req, res) => res.json([]));
router.get('/sponsors', (req, res) => res.json([]));
router.get('/producers', (req, res) => res.json([]));

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
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });
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
  res.status(201).json(item);
});

router.delete('/queue/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.queue = memory.queue.filter((q) => q.id !== id);
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
  res.status(201).json(chat);
});

router.put('/chats/:id/status', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const status = req.body && req.body.status ? String(req.body.status) : '';
  memory.chats = memory.chats.map((c) => (c.id === id ? { ...c, status: status || c.status } : c));
  res.json({ ok: true });
});

router.put('/chats/:id/assign', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const userId = req.user && req.user.id ? String(req.user.id) : null;
  memory.chats = memory.chats.map((c) => (c.id === id ? { ...c, assigned_to: userId } : c));
  res.json({ ok: true });
});

router.put('/chats/:id/mark-read', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.chats = memory.chats.map((c) => {
    if (c.id !== id) return c;
    const messages = (c.messages || []).map((m) => ({ ...m, read: true }));
    return { ...c, messages };
  });
  res.json({ ok: true });
});

router.delete('/chats/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.chats = memory.chats.filter((c) => c.id !== id);
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

  res.status(201).json(msg);
});

router.get('/admin/artist/:artistId/metrics', authRequired, (req, res) => {
  Promise.resolve()
    .then(async () => {
      const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
      if (!artistId || !isUuidLike(artistId)) return { total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 };
      const { rows } = await pool.query(
        `SELECT total_plays, ouvintes_mensais, receita_estimada
         FROM public.artist_metrics
         WHERE artist_id = $1
         LIMIT 1`,
        [artistId]
      );
      return rows[0] || { total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 };
    })
    .then((m) => res.json(m))
    .catch(() => res.json({ total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 }));
});

router.post('/admin/artist/:artistId/metrics', authRequired, (req, res) => {
  Promise.resolve()
    .then(async () => {
      const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
      if (!artistId || !isUuidLike(artistId)) return { error: 'artistId inválido' };

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
      return rows[0] || { total_plays, ouvintes_mensais, receita_estimada, updated_at: new Date().toISOString() };
    })
    .then((m) => {
      if (m && m.error) return res.status(400).json(m);
      res.json(m);
    })
    .catch(() => res.status(500).json({ error: 'Falha ao salvar métricas' }));
});

export default router;
