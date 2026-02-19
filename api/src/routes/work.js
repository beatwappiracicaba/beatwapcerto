import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const workRouter = express.Router();

workRouter.get('/admin/artist/:id/metrics', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select artista_id,total_plays,ouvintes_mensais,receita_estimada
       from artist_metrics
       where artista_id=$1`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.json({
        artista_id: id,
        total_plays: 0,
        ouvintes_mensais: 0,
        receita_estimada: 0
      });
    }
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.post('/admin/artist/:id/metrics', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { total_plays, ouvintes_mensais, receita_estimada } = req.body || {};
    const existing = await query(
      `select id from artist_metrics where artista_id=$1`,
      [id]
    );
    let r;
    if (existing.rowCount > 0) {
      r = await query(
        `update artist_metrics
         set total_plays=$1, ouvintes_mensais=$2, receita_estimada=$3
         where artista_id=$4
         returning artista_id,total_plays,ouvintes_mensais,receita_estimada`,
        [Number(total_plays || 0), Number(ouvintes_mensais || 0), Number(receita_estimada || 0), id]
      );
    } else {
      r = await query(
        `insert into artist_metrics (artista_id,total_plays,ouvintes_mensais,receita_estimada)
         values ($1,$2,$3,$4)
         returning artista_id,total_plays,ouvintes_mensais,receita_estimada`,
        [id, Number(total_plays || 0), Number(ouvintes_mensais || 0), Number(receita_estimada || 0)]
      );
    }
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.get('/artist/marketing/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select * from artist_marketing where artist_id=$1`,
      [id]
    );
    if (r.rowCount === 0) return res.json({});
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.put('/artist/marketing/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['composer_plan'];
    const data = {};
    allowed.forEach((k) => { if (k in req.body) data[k] = req.body[k]; });
    if (!Object.keys(data).length) return res.json({ ok: true });
    const existing = await query(`select id from artist_marketing where artist_id=$1`, [id]);
    if (existing.rowCount === 0) {
      const fields = ['artist_id', ...Object.keys(data)];
      const cols = fields.join(',');
      const placeholders = fields.map((_, i) => `$${i+1}`).join(',');
      const vals = [id, ...Object.keys(data).map(k => data[k])];
      await query(`insert into artist_marketing (${cols}) values (${placeholders})`, vals);
    } else {
      const sets = Object.keys(data).map((k, i) => `${k}=$${i+1}`);
      const vals = Object.keys(data).map(k => data[k]);
      vals.push(id);
      await query(`update artist_marketing set ${sets.join(',')} where artist_id=$${sets.length+1}`, vals);
    }
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.get('/artist/events', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `select id,title,date,type,notes,created_at,status,has_contract
       from artist_work_events
       where artista_id=$1 and (status <> 'cancelado' or has_contract = true)
       order by date asc`,
      [uid]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.post('/artist/events', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { title, date, type, notes } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Missing fields' });
    const r = await query(
      `insert into artist_work_events (artista_id,title,date,type,notes,created_by) values ($1,$2,$3,$4,$5,$1)
       returning id,title,date,type,notes,created_at`,
      [uid, title, date, type || 'outro', notes || '']
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.get('/artist/todos', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `select id,title,due_date,status,created_at,updated_at
       from artist_todos
       where artista_id=$1
       order by created_at desc`,
      [uid]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.post('/artist/todos', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { title, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const r = await query(
      `insert into artist_todos (artista_id,title,due_date,status,created_by) values ($1,$2,$3,'pendente',$1)
       returning id,title,due_date,status,created_at,updated_at`,
      [uid, title, due_date || null]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

workRouter.post('/artist/todos/:id', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    const r = await query(
      `update artist_todos set status=$1, updated_at=now() where id=$2 and artista_id=$3 returning id,title,due_date,status,created_at,updated_at`,
      [status, id, uid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
