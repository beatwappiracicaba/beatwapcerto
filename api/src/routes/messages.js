import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const messagesRouter = express.Router();

messagesRouter.get('/messages', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      'select id,sender_id,receiver_id,message,created_at from messages where sender_id=$1 or receiver_id=$1 order by created_at desc limit 100',
      [uid]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

messagesRouter.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    const sender_id = req.user.id;
    if (!receiver_id || !message) return res.status(400).json({ error: 'Missing fields' });
    const r = await query(
      'insert into messages (sender_id,receiver_id,message) values ($1,$2,$3) returning id,sender_id,receiver_id,message,created_at',
      [sender_id, receiver_id, message]
    );
    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});
