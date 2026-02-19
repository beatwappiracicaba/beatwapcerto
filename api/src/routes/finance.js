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

financeRouter.post('/artist/finance/events/:id/receipts', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      receipt_artist,
      receipt_seller,
      receipt_house,
      receipt_manager,
      contract_file,
      markAsPaid,
      hasContract
    } = req.body || {};
    const updates = [];
    const vals = [];
    let idx = 1;
    const setField = (field, val) => { updates.push(`${field}=$${idx++}`); vals.push(val); };
    if (receipt_artist) setField('receipt_artist', receipt_artist);
    if (receipt_seller) setField('receipt_seller', receipt_seller);
    if (receipt_house) setField('receipt_house', receipt_house);
    if (receipt_manager) setField('receipt_manager', receipt_manager);
    if (contract_file) setField('contract_url', contract_file);
    if (typeof hasContract === 'boolean') setField('has_contract', hasContract);
    if (markAsPaid === true) setField('status', 'pago');
    if (updates.length === 0) return res.json({ ok: true, unchanged: true });
    vals.push(id);
    const sql = `update artist_work_events set ${updates.join(', ')} where id=$${idx} returning *`;
    const r = await query(sql, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

financeRouter.get('/sellers/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: leads } = await query(
      `select 
         coalesce(sum(case when status='fechado' then budget else 0 end),0)::numeric as total_sold,
         count(*)::int as total_leads
       from leads where seller_id=$1`,
      [id]
    );
    const { rows: comms } = await query(
      `select status, coalesce(sum(amount),0)::numeric as total 
       from commissions where seller_id=$1 group by status`,
      [id]
    );
    const totalSold = Number(leads[0]?.total_sold || 0);
    const pendingCommissions = Number(comms.find(c => c.status === 'pendente')?.total || 0);
    const paidCommissions = Number(comms.find(c => c.status === 'pago')?.total || 0);
    const totalCommissions = pendingCommissions + paidCommissions;
    return res.json({ totalSold, totalCommissions, pendingCommissions, paidCommissions, totalLeads: leads[0]?.total_leads || 0 });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
