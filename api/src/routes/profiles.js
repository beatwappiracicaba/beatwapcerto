import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const profilesRouter = express.Router();

profilesRouter.get('/profiles/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query('select * from profiles where id=$1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

profilesRouter.put('/profile', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const allowed = [
      'nome','bio','genero_musical','youtube_url','spotify_url','deezer_url','tiktok_url','instagram_url','site_url','avatar_url'
    ];
    const data = {};
    allowed.forEach((k) => { if (k in req.body) data[k] = req.body[k]; });
    const fields = Object.keys(data);
    if (fields.length === 0) return res.json({ ok: true });
    const sets = fields.map((f, i) => `${f}=$${i+1}`);
    const vals = fields.map((f) => data[f]);
    vals.push(uid);
    const sql = `update profiles set ${sets.join(',')} where id=$${fields.length+1} returning *`;
    const r = await query(sql, vals);
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
