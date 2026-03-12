import { Router } from 'express';
import { getMyProfile, getProfile, getProfiles, updateMyProfile, updateProfile, updateProfilePermissions, uploadMyAvatar } from '../controllers/profiles.controller.js';
import { authRequired } from '../middleware/auth.js';
import { listProfiles } from '../models/profiles.model.js';
import { pool } from '../db.js';

const router = Router();

router.get('/profiles', getProfiles);
router.get('/profiles/artists/all', async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Artista', limit: 500 });
    const normalized = (Array.isArray(rows) ? rows : []).map((p) => {
      if (!p || typeof p !== 'object') return p;
      return { ...p, avatar_url: sanitizeAvatarUrl(p.avatar_url) };
    });
    res.json(normalized);
  } catch (err) {
    next(err);
  }
});
router.get('/profiles/:id', getProfile);
function isUuidLike(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
}

function isMissingTableError(err) {
  return !!(err && (err.code === '42P01' || /does not exist/i.test(String(err.message || ''))));
}

function sanitizeAvatarUrl(url) {
  const u = typeof url === 'string' ? url : '';
  if (!u) return null;
  if (u.startsWith('data:')) return null;
  if (u.length > 2048) return null;
  return u;
}

router.get('/profiles/:id/posts', async (req, res, next) => {
  try {
    const userId = req.params && req.params.id ? String(req.params.id) : '';
    if (!userId || !isUuidLike(userId)) return res.status(400).json({ error: 'id inválido' });
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
    if (isMissingTableError(err)) return res.json([]);
    next(err);
  }
});
router.get('/profiles/:id/musics', (req, res) => res.json([]));
router.get('/profiles/:id/feats', (req, res) => res.json([]));
router.get('/profiles/:id/produced-musics', (req, res) => res.json([]));
router.get('/profiles/:id/compositions', (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  if (!id || !isUuidLike(id)) return res.status(400).json({ error: 'id inválido' });
  const memory = globalThis.__beatwapMemory || {};
  const rows = (Array.isArray(memory.compositions) ? memory.compositions : [])
    .filter((c) => c && typeof c === 'object')
    .filter((c) => String(c.composer_id || '') === id)
    .filter((c) => String(c.status || '') === 'approved')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 200);
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});
router.get('/profile', authRequired, getMyProfile);
router.put('/profile', authRequired, updateMyProfile);
router.put('/profiles', authRequired, updateMyProfile);
router.put('/profiles/:id', authRequired, updateProfile);
router.put('/profiles/:id/access-control', authRequired, updateProfilePermissions);
router.post('/profile/avatar', authRequired, uploadMyAvatar);

export default router;
