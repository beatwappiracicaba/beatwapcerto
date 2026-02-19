import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const profilesRouter = express.Router();

profilesRouter.get('/profiles', async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url, cargo, celular
       from profiles
       order by created_at desc`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

profilesRouter.get('/producers', async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social
       from profiles
       where cargo = 'Produtor'
       order by nome asc nulls last, created_at desc`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

profilesRouter.get('/composers', async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url, cargo, plano, bonus_quota, plan_started_at
       from profiles
       where cargo = 'Compositor'
       order by nome asc nulls last, created_at desc`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

profilesRouter.put('/profiles/:id/access-control', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { access_control } = req.body || {};
    await query(
      `update profiles set access_control=$1 where id=$2`,
      [access_control || {}, id]
    );
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

profilesRouter.get('/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query('select * from profiles where id=$1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

profilesRouter.put('/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      'nome','bio','avatar_url','genero_musical','youtube_url','spotify_url','deezer_url','tiktok_url','instagram_url','site_url',
      'plano','bonus_quota','plan_started_at'
    ];
    const data = {};
    allowed.forEach((k) => { if (k in req.body) data[k] = req.body[k]; });
    if (Object.keys(data).length === 0) return res.json({ ok: true });
    const sets = Object.keys(data).map((f, i) => `${f}=$${i+1}`);
    const vals = Object.keys(data).map((f) => data[f]);
    vals.push(id);
    const sql = `update profiles set ${sets.join(',')} where id=$${sets.length+1} returning *`;
    const r = await query(sql, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

profilesRouter.get('/artists', authMiddleware, async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social
       from profiles
       where cargo = 'Artista'
       order by created_at desc`,
      []
    );
    return res.json(r.rows);
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

profilesRouter.post('/profile/avatar', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image' });
    }
    const r = await query('update profiles set avatar_url=$1 where id=$2 returning avatar_url', [dataUrl, uid]);
    return res.json({ avatar_url: r.rows[0]?.avatar_url || null });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
