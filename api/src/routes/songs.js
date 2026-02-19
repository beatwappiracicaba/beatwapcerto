import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const songsRouter = express.Router();

songsRouter.get('/songs', async (_req, res) => {
  try {
    const r = await query('select id,artist_id,title,cover_url,audio_url,created_at from songs order by created_at desc limit 50', []);
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

songsRouter.post('/songs', authMiddleware, async (req, res) => {
  try {
    const { title, cover_url, audio_url } = req.body;
    const artistId = req.user.id;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const r = await query(
      'insert into songs (artist_id,title,cover_url,audio_url) values ($1,$2,$3,$4) returning id,artist_id,title,cover_url,audio_url,created_at',
      [artistId, title, cover_url || null, audio_url || null]
    );
    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});
