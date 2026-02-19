import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const financeRouter = express.Router();

financeRouter.get('/seller/finance/summary', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows: leads } = await query(
      `select coalesce(sum(budget),0)::numeric as total_sold
       from leads where seller_id=$1 and status='fechado'`,
      [uid]
    );
    const { rows: comms } = await query(
      `select status, coalesce(sum(amount),0)::numeric as total 
       from commissions where seller_id=$1 group by status`,
      [uid]
    );
    const { rows: events } = await query(
      `select e.*, a.nome as artist_name
       from artist_work_events e
       left join profiles a on a.id = e.artista_id
       where e.seller_id=$1 and (e.status <> 'cancelado' or e.has_contract = true)
       order by e.date desc`,
      [uid]
    );
    const totalSold = Number(leads[0]?.total_sold || 0);
    const pendingCommissions = Number(comms.find(c => c.status === 'pendente')?.total || 0);
    const paidCommissions = Number(comms.find(c => c.status === 'pago')?.total || 0);
    const totalCommissions = pendingCommissions + paidCommissions;
    return res.json({ totalSold, totalCommissions, pendingCommissions, paidCommissions, events });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

financeRouter.get('/artist/finance/events', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await query(
      `select * from artist_work_events
       where artista_id=$1 and (status <> 'cancelado' or has_contract = true)
       order by date desc`,
      [uid]
    );
    return res.json(rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
