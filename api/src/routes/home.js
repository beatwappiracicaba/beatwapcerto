import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const homeRouter = express.Router();

homeRouter.get('/admin/stats', async (_req, res) => {
  try {
    const artists = await query(`select count(*)::int as c from profiles where cargo='Artista'`, []);
    const musics = await query(`select count(*)::int as c from musics`, []);
    const pending = await query(`select count(*)::int as c from musics where status='pendente'`, []);
    return res.json({
      artists: artists.rows[0]?.c || 0,
      musics: musics.rows[0]?.c || 0,
      pending: pending.rows[0]?.c || 0
    });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/producer-projects', async (_req, res) => {
  try {
    const r = await query(
      `select id,title,url,platform,published,created_at,cover_url
       from producer_projects
       order by created_at desc
       limit 10`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.post('/producer-projects', async (req, res) => {
  try {
    const { producer_id, title, url, platform, published } = req.body || {};
    if (!producer_id || !title || !url || !platform) return res.status(400).json({ error: 'Missing fields' });
    const r = await query(
      `insert into producer_projects (producer_id,title,url,platform,published)
       values ($1,$2,$3,$4,$5)
       returning id,title,url,platform,published,created_at,cover_url`,
      [producer_id, title, url, platform, published ?? true]
    );
    return res.json(r.rows[0]);
  } catch (e) { 
    console.error(e); 
    return res.status(500).json({ error: e?.message || 'Server error' }); 
  }
});

homeRouter.delete('/producer-projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(`delete from producer_projects where id=$1 returning id`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/analytics/artist/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const events = await query(
      `select type, duration_seconds, ip_hash 
       from analytics_events
       where artist_id=$1`,
      [id]
    );
    const agg = { plays: 0, listeners: new Set(), time: 0, profile_views: 0, social_clicks: 0 };
    (events.rows || []).forEach(e => {
      if (e.type === 'music_play') {
        agg.plays++;
        agg.time += Number(e.duration_seconds || 0);
        if (e.ip_hash) agg.listeners.add(e.ip_hash);
      } else if (e.type === 'profile_view') {
        agg.profile_views++;
      } else if (e.type && e.type.startsWith('artist_click_')) {
        agg.social_clicks++;
      }
    });
    return res.json({
      plays: agg.plays,
      listeners: agg.listeners.size,
      time: agg.time,
      profile_views: agg.profile_views,
      social_clicks: agg.social_clicks
    });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/analytics/artist/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const events = await query(
      `select type, music_id, duration_seconds, ip_hash 
       from analytics_events
       where artist_id=$1`,
      [id]
    );
    return res.json(events.rows || []);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/admin/musics', async (req, res) => {
  try {
    const { artist_id, status } = req.query;
    const conds = [];
    const vals = [];
    if (artist_id) { vals.push(artist_id); conds.push(`artista_id=$${vals.length}`); }
    if (status) { vals.push(status); conds.push(`status=$${vals.length}`); }
    const where = conds.length ? `where ${conds.join(' and ')}` : '';
    const r = await query(
      `select * from musics ${where} order by created_at desc`,
      vals
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.post('/admin/musics', async (req, res) => {
  try {
    const allowed = [
      'status','titulo','estilo','isrc','upc','artista_id','nome_artista',
      'audio_url','cover_url','authorization_url','plataformas','composer',
      'producer','has_feat','feat_name','album_id','album_title','is_beatwap_produced',
      'produced_by','show_on_home'
    ];
    const data = {};
    allowed.forEach((k) => { if (k in req.body) data[k] = req.body[k]; });
    const fields = Object.keys(data);
    if (!fields.length) return res.status(400).json({ error: 'No fields to insert' });
    const cols = fields.join(',');
    const placeholders = fields.map((_, i) => `$${i+1}`).join(',');
    const vals = fields.map((f) => data[f]);
    const sql = `insert into musics (${cols}) values (${placeholders}) returning *`;
    const r = await query(sql, vals);
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.put('/admin/musics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['titulo','estilo','isrc','upc','status','nome_artista','artista_id','audio_url','cover_url','authorization_url','album_id','album_title','is_beatwap_produced','produced_by','show_on_home'];
    const data = {};
    allowed.forEach(k => { if (k in req.body) data[k] = req.body[k]; });
    if (Object.keys(data).length === 0) return res.json({ ok: true });
    const sets = Object.keys(data).map((k, i) => `${k}=$${i+1}`);
    const vals = Object.keys(data).map(k => data[k]);
    vals.push(id);
    const r = await query(`update musics set ${sets.join(', ')} where id=$${sets.length+1} returning *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/sponsors', async (_req, res) => {
  try {
    const r = await query(
      `select id,name,logo_url,instagram_url,site_url,active,created_at
       from sponsors
       order by created_at desc`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.post('/sponsors', async (req, res) => {
  try {
    const { name, instagram_url, site_url, logo_data, created_by } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const r = await query(
      `insert into sponsors (name, instagram_url, site_url, logo_url, active, created_by)
       values ($1,$2,$3,$4,true,$5)
       returning id,name,logo_url,instagram_url,site_url,active,created_at`,
      [name, instagram_url || null, site_url || null, logo_data || null, created_by || null]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.put('/sponsors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body || {};
    const r = await query(
      `update sponsors set active=$1 where id=$2 returning id`,
      [active === true, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.delete('/sponsors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(`delete from sponsors where id=$1 returning id`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.delete('/admin/musics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(`delete from musics where id=$1 returning id`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/musics/:id/external-metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { source } = req.query;
    const r = await query(
      `select * from music_external_metrics where music_id=$1 and source=$2 limit 1`,
      [id, source || 'manual']
    );
    return res.json(r.rows[0] || null);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.post('/musics/:id/external-metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { source, plays, listeners, revenue } = req.body || {};
    const r = await query(
      `insert into music_external_metrics (music_id, source, plays, listeners, revenue, updated_at)
       values ($1,$2,$3,$4,$5, now())
       on conflict (music_id, source)
       do update set plays=excluded.plays, listeners=excluded.listeners, revenue=excluded.revenue, updated_at=now()
       returning *`,
      [id, source || 'manual', Number(plays || 0), Number(listeners || 0), Number(revenue || 0)]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
homeRouter.get('/home/producers', async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url, cargo
       from profiles
       where cargo = 'Produtor'
       order by created_at desc
       limit 12`,
      []
    );
    return res.json(r.rows.map(u => ({ 
      id: u.id, 
      name: u.nome || u.nome_completo_razao_social || null,
      avatar_url: u.avatar_url, 
      cargo: u.cargo 
    })));
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/me/uploads/count', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { type, start, end } = req.query;
    let sql, vals;
    if (type === 'composition') {
      sql = `select count(*)::int as c from compositions where composer_id=$1`;
      vals = [uid];
    } else {
      sql = `select count(*)::int as c from musics where artista_id=$1`;
      vals = [uid];
    }
    if (start) {
      vals.push(start);
      sql += ` and created_at >= $${vals.length}`;
    }
    if (end) {
      vals.push(end);
      sql += ` and created_at <= $${vals.length}`;
    }
    const r = await query(sql, vals);
    return res.json({ count: r.rows[0]?.c || 0 });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
homeRouter.get('/home/sellers', async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url, cargo
       from profiles
       where cargo = 'Vendedor'
       order by created_at desc
       limit 12`,
      []
    );
    return res.json(r.rows.map(u => ({ 
      id: u.id, 
      name: u.nome || u.nome_completo_razao_social || null,
      avatar_url: u.avatar_url, 
      cargo: u.cargo 
    })));
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

homeRouter.get('/home/artists', async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url, cargo
       from profiles
       where cargo = 'Artista'
       order by created_at desc
       limit 24`,
      []
    );
    return res.json(r.rows.map(u => ({ 
      id: u.id, 
      name: u.nome || u.nome_completo_razao_social || null,
      avatar_url: u.avatar_url, 
      cargo: u.cargo 
    })));
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

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

homeRouter.get('/albums/:id/tracks', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select id,titulo,nome_artista,estilo,cover_url,preview_url,audio_url,release_date,created_at,artista_id,album_title
       from musics
       where album_id=$1 and status='aprovado'
       order by created_at asc`,
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
