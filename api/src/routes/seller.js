import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRoles } from '../auth/auth.middleware.js';

export const sellerRouter = express.Router();

sellerRouter.get('/seller/artists', requireAuth, requireRoles('Vendedor'), async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, avatar_url, cidade, estado, genero_musical, cache_medio
       from profiles
       where cargo = 'Artista'
       order by nome asc nulls last, created_at desc`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.get('/admin/artist/:id/todos', requireAuth, requireRoles('Produtor', 'Vendedor'), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `select id,title,due_date,status,created_at,updated_at
       from artist_todos
       where artista_id=$1
       order by created_at desc`,
      [id]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.post('/admin/artist/:id/todos', requireAuth, requireRoles('Produtor', 'Vendedor'), async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const { title, due_date } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const r = await query(
      `insert into artist_todos (artista_id,title,due_date,status,created_by)
       values ($1,$2,$3,'pendente',$4)
       returning id,title,due_date,status,created_at,updated_at`,
      [id, title, due_date || null, uid]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.post('/admin/todos/:id/status', requireAuth, requireRoles('Produtor', 'Vendedor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const r = await query(
      `update artist_todos set status=$1, updated_at=now() where id=$2 returning id,title,due_date,status,created_at,updated_at`,
      [status || 'pendente', id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
sellerRouter.patch('/seller/artists/:id/cache', requireAuth, requireRoles('Vendedor', 'Produtor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body || {};
    const r = await query(
      `update profiles set cache_medio=$1 where id=$2 returning id, cache_medio`,
      [value || null, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.get('/seller/artists/:id/events', requireAuth, requireRoles('Vendedor', 'Produtor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query; // YYYY-MM
    let rows = [];
    if (month && /^\d{4}-\d{2}$/.test(String(month))) {
      const y = Number(month.slice(0, 4));
      const m = Number(month.slice(5, 7));
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();
      const r = await query(
        `select * from leads 
         where artist_id=$1 
           and status='fechado'
           and event_date between $2 and $3
         order by event_date asc`,
        [id, start, end]
      );
      rows = r.rows;
    } else {
      const r = await query(
        `select * from leads 
         where artist_id=$1 
           and status='fechado'
         order by event_date desc`,
        [id]
      );
      rows = r.rows;
    }
    return res.json(rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.get('/seller/calendar', requireAuth, requireRoles('Vendedor'), async (req, res) => {
  try {
    const uid = req.user.id;
    const { month } = req.query; // YYYY-MM
    const now = month && /^\d{4}-\d{2}$/.test(String(month))
      ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)
      : new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const r = await query(
      `select * from leads 
       where seller_id=$1 
         and status='fechado'
         and event_date between $2 and $3
       order by event_date asc`,
      [uid, start, end]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.get('/seller/artist-events', requireAuth, requireRoles('Vendedor', 'Produtor'), async (req, res) => {
  try {
    const { artist_id, month } = req.query;
    if (!artist_id) return res.status(400).json({ error: 'artist_id required' });
    const now = month && /^\d{4}-\d{2}$/.test(String(month))
      ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)
      : new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const r = await query(
      `select * from artist_work_events
       where artista_id=$1
         and date between $2 and $3
         and (status <> 'cancelado' or has_contract = true)
       order by date asc`,
      [artist_id, start, end]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.post('/seller/artist-events', requireAuth, requireRoles('Vendedor', 'Produtor'), async (req, res) => {
  try {
    const uid = req.user.id;
    const { artista_id, title, date, type, notes } = req.body || {};
    if (!artista_id || !title || !date) {
      return res.status(400).json({ error: 'artista_id, title and date are required' });
    }
    const r = await query(
      `insert into artist_work_events (artista_id, title, date, type, notes, created_by)
       values ($1,$2,$3,$4,$5,$6)
       returning *`,
      [artista_id, title, date, type || 'show', notes || null, uid]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.get('/seller/leads', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `select l.*,
              a.nome as artist_nome,
              a.nome_completo_razao_social as artist_nome_completo
       from leads l
       left join profiles a on a.id = l.artist_id
       where l.seller_id=$1
       order by l.created_at desc`,
      [uid]
    );
    return res.json(r.rows.map(l => ({
      ...l,
      artist: {
        nome: l.artist_nome,
        nome_completo_razao_social: l.artist_nome_completo
      }
    })));
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.get('/seller/leads/:id/history', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const r = await query(
      `select * from negotiation_history
       where lead_id=$1 and seller_id=$2
       order by created_at desc`,
      [id, uid]
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.post('/seller/leads/:id/history', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const { notes } = req.body || {};
    const r = await query(
      `insert into negotiation_history (lead_id, seller_id, notes, contact_date)
       values ($1,$2,$3, now())
       returning *`,
      [id, uid, notes || '']
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.get('/seller/contractors', requireAuth, async (_req, res) => {
  try {
    const r = await query(
      `select id, nome, nome_completo_razao_social, celular
       from profiles
       order by nome asc nulls last, created_at desc`,
      []
    );
    return res.json(r.rows);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.post('/seller/leads', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const {
      contractor_name,
      event_name,
      city,
      event_date,
      budget,
      status,
      artist_id,
      whatsapp,
      contractor_id
    } = req.body || {};
    const r = await query(
      `insert into leads (seller_id, contractor_name, event_name, city, event_date, budget, status, artist_id, whatsapp, contractor_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       returning *`,
      [uid, contractor_name || '', event_name || '', city || '', event_date || null,
       Number(budget || 0), status || 'novo', artist_id, whatsapp || null, contractor_id || null]
    );
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.put('/seller/leads/:id', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const allowed = [
      'contractor_name','event_name','city','event_date','budget','status',
      'artist_id','whatsapp','contractor_id'
    ];
    const data = {};
    allowed.forEach((k) => { if (k in req.body) data[k] = req.body[k]; });
    if (Object.keys(data).length === 0) return res.json({ ok: true });
    const sets = Object.keys(data).map((k, i) => `${k}=$${i+1}`);
    const vals = Object.keys(data).map(k => data[k]);
    vals.push(id, uid);
    const sql = `update leads set ${sets.join(',')} where id=$${sets.length+1} and seller_id=$${sets.length+2} returning *`;
    const r = await query(sql, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.delete('/seller/leads/:id', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;

    const events = await query(
      `select has_contract from artist_work_events where lead_id=$1`,
      [id]
    );
    const hasContract = (events.rows || []).some(e => e.has_contract);
    if (hasContract) {
      return res.status(400).json({ error: 'Lead com contrato não pode ser excluído' });
    }

    await query(`delete from artist_work_events where lead_id=$1`, [id]);
    await query(`delete from negotiation_history where lead_id=$1`, [id]);
    const r = await query(
      `delete from leads where id=$1 and seller_id=$2 returning *`,
      [id, uid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});

sellerRouter.post('/seller/leads/:id/sync-agenda', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const {
      status,
      artist_id,
      event_name,
      event_date,
      contractor_name,
      budget,
      city
    } = req.body || {};

    const existingRes = await query(
      `select id, has_contract from artist_work_events where lead_id=$1 limit 1`,
      [id]
    );
    const existing = existingRes.rows[0] || null;

    if (status === 'perdido' || status === 'cancelado') {
      if (existing) {
        if (existing.has_contract) {
          await query(
            `update artist_work_events set status='cancelado' where id=$1`,
            [existing.id]
          );
        } else {
          await query(
            `delete from artist_work_events where id=$1`,
            [existing.id]
          );
        }
      }
      return res.json({ ok: true, updated: true });
    }

    let eventStatus = 'pendente';
    if (status === 'novo') eventStatus = 'proposta';
    else if (status === 'negociacao') eventStatus = 'negociacao';
    else if (status === 'fechado') eventStatus = 'fechado';

    const eventPayload = {
      artista_id: artist_id,
      title: event_name || 'Show Confirmado',
      date: event_date ? new Date(event_date).toISOString() : new Date().toISOString(),
      type: 'show',
      notes: `Lead ${status} com ${contractor_name}. Valor: R$ ${budget}`,
      revenue: Number(budget || 0),
      seller_id: uid,
      status: eventStatus,
      lead_id: id,
      city: city || null
    };

    if (existing) {
      const fields = Object.keys(eventPayload);
      const sets = fields.map((f, i) => `${f}=$${i+1}`);
      const vals = fields.map(f => eventPayload[f]);
      vals.push(existing.id);
      await query(
        `update artist_work_events set ${sets.join(',')} where id=$${fields.length+1}`,
        vals
      );
    } else {
      const fields = Object.keys(eventPayload);
      const cols = fields.join(',');
      const placeholders = fields.map((_, i) => `$${i+1}`).join(',');
      const vals = fields.map(f => eventPayload[f]);
      await query(
        `insert into artist_work_events (${cols}, created_by) values (${placeholders}, $${fields.length+1})`,
        [...vals, uid]
      );
    }

    return res.json({ ok: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
});
