import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const aiRouter = express.Router();

aiRouter.get('/ai/history', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `select id,role,content,created_at from ai_chat_messages where user_id=$1 order by created_at asc`,
      [uid]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

aiRouter.post('/ai/history', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { role, content } = req.body;
    await query(
      `insert into ai_chat_messages (user_id,role,content) values ($1,$2,$3)`,
      [uid, role || 'user', content || '']
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

aiRouter.post('/ai/history/clear', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    await query(`delete from ai_chat_messages where user_id=$1`, [uid]);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

aiRouter.post('/ai/chat', authMiddleware, async (req, res) => {
  try {
    const { messages } = req.body;
    const response = await fetch('http://localhost:3000/api/assistente-ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
    if (!response.ok) {
      return res.status(500).json({ error: 'AI backend error' });
    }
    const data = await response.json();
    return res.json({ reply: data.reply || data.choices?.[0]?.message?.content || '' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

