import express from 'express';
import { query } from '../db.js';

export const homeRouter = express.Router();

homeRouter.get('/home/releases', async (_req, res) => {
  try {
    const r = await query(
      `select id,titulo,nome_artista,estilo,cover_url,preview_url,audio_url,presave_link,release_date,created_at,artista_id,is_beatwap_produced,show_on_home,produced_by,album_id,album_title
       from musics
       where status='aprovado'
       order by created_at desc
       limit 24`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/home/compositions', async (_req, res) => {
  try {
    const r = await query(
      `select id, title, genre, cover_url, audio_url, created_at, composer_id, status
       from compositions
       where status='approved'
       order by created_at desc
       limit 8`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/home/projects', async (_req, res) => {
  try {
    const r = await query(
      `select id,title,url,platform,created_at
       from producer_projects
       where platform='YouTube'
       order by created_at desc
       limit 6`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/home/sponsors', async (_req, res) => {
  try {
    const r = await query(
      `select id,name,logo_url,instagram_url,site_url,created_at
       from sponsors
       where active = true
       order by created_at desc
       limit 12`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/home/composers', async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url
       from profiles
       where cargo = 'Compositor'
       order by created_at desc
       limit 8`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/profiles/:id/musics', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select * from musics
       where artista_id=$1 and status='aprovado'
       order by created_at desc`,
      [id]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/profiles/:id/feats', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select * from musics
       where status='aprovado' and feat_beatwap_artist_ids @> $1::uuid[] 
       order by created_at desc`,
      [[id]]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/profiles/:id/produced-musics', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select * from musics
       where produced_by=$1 and status='aprovado'
       order by created_at desc`,
      [id]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/profiles/:id/compositions', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select * from compositions
       where composer_id=$1 and status='approved'
       order by created_at desc`,
      [id]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.post('/analytics', async (req, res) => {
  try {
    const { type, ip_hash, music_id, artist_id, duration_seconds } = req.body || {};
    await query(
      `insert into analytics_events (type, ip_hash, music_id, artist_id, duration_seconds)
       values ($1,$2,$3,$4,$5)`,
      [type || null, ip_hash || null, music_id || null, artist_id || null, duration_seconds || null]
    );
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
