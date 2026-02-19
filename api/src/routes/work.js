import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const workRouter = express.Router();

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
