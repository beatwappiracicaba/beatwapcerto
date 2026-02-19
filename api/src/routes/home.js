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
