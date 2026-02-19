import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const compositionsRouter = express.Router();

compositionsRouter.get('/artist/compositions', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `select * from compositions where composer_id=$1 order by created_at desc`,
      [uid]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
