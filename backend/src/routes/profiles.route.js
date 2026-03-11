import { Router } from 'express';
import { getMyProfile, getProfile, getProfiles, updateMyProfile, updateProfile, uploadMyAvatar } from '../controllers/profiles.controller.js';
import { authRequired } from '../middleware/auth.js';
import { listProfiles } from '../models/profiles.model.js';
import { pool } from '../db.js';

const router = Router();

router.get('/profiles', getProfiles);
router.get('/profiles/artists/all', async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Artista', limit: 500 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
router.get('/profiles/:id', getProfile);
router.get('/profiles/:id/posts', (req, res) => res.json([]));
router.get('/profiles/:id/musics', (req, res) => res.json([]));
router.get('/profiles/:id/feats', (req, res) => res.json([]));
router.get('/profiles/:id/produced-musics', (req, res) => res.json([]));
router.get('/profiles/:id/compositions', (req, res) => res.json([]));
router.get('/profile', authRequired, getMyProfile);
router.put('/profile', authRequired, updateMyProfile);
router.put('/profiles', authRequired, updateMyProfile);
router.put('/profiles/:id', authRequired, updateProfile);
router.post('/profile/avatar', authRequired, uploadMyAvatar);

export default router;
