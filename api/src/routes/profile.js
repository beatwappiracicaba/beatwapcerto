import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const profileRouter = express.Router();

profileRouter.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('select id,name as nome,email,role as cargo,created_at from users where id=$1', [userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});
