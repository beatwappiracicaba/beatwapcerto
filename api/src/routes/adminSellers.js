import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../auth/auth.middleware.js';

export const adminSellersRouter = express.Router();

adminSellersRouter.get('/admin/sellers', requireAuth, requireRoles('Produtor'), async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url, cargo, cidade, estado
       from profiles
       where cargo = 'Vendedor'
       order by created_at desc`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

adminSellersRouter.get('/admin/sellers/:id/goals', requireAuth, requireRoles('Produtor'), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select * from seller_goals where seller_id=$1 order by year desc, month desc`,
      [id]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

adminSellersRouter.get('/admin/sellers/:id/commissions', requireAuth, requireRoles('Produtor'), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select c.*, l.contractor_name 
       from commissions c
       left join leads l on l.id = c.lead_id
       where c.seller_id=$1
       order by c.created_at desc`,
      [id]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

adminSellersRouter.get('/admin/sellers/:id/leads', requireAuth, requireRoles('Produtor'), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select * from leads where seller_id=$1 order by created_at desc`,
      [id]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

adminSellersRouter.post('/admin/sellers/:id/goals', requireAuth, requireRoles('Produtor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, shows_target, revenue_target } = req.body || {};
    const r = await query(
      `insert into seller_goals (seller_id, month, year, shows_target, revenue_target)
       values ($1,$2,$3,$4,$5)
       on conflict (seller_id, month, year) do update set
         shows_target = excluded.shows_target,
         revenue_target = excluded.revenue_target
       returning *`,
      [id, month, year, shows_target, revenue_target]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

adminSellersRouter.patch('/admin/commissions/:id/status', requireAuth, requireRoles('Produtor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const r = await query(
      `update commissions set status=$1 where id=$2 returning *`,
      [status, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

