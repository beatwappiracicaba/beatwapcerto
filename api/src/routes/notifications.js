import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const notificationsRouter = express.Router();

notificationsRouter.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `select * from notifications where recipient_id=$1 order by created_at desc`,
      [uid]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

notificationsRouter.post('/notifications', authMiddleware, async (req, res) => {
  try {
    const { recipientId, title, message, type, link } = req.body;
    const recipient = recipientId || req.user.id;
    const r = await query(
      `insert into notifications (recipient_id,title,message,type,link,read)
       values ($1,$2,$3,$4,$5,false)
       returning *`,
      [recipient, title || '', message || '', type || 'info', link || null]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

notificationsRouter.post('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const r = await query(
      `update notifications set read=true where id=$1 and recipient_id=$2 returning *`,
      [id, uid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

notificationsRouter.post('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    await query(
      `update notifications set read=true where recipient_id=$1 and read=false`,
      [uid]
    );
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
