import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const proposalsRouter = express.Router();

proposalsRouter.get('/seller/proposals', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      `select p.*, l.contractor_name, l.event_name, a.nome as artist_nome
       from proposals p
       left join leads l on l.id = p.lead_id
       left join profiles a on a.id = p.artist_id
       where p.seller_id=$1
       order by p.created_at desc`,
      [uid]
    );
    const rows = r.rows.map(row => ({
      ...row,
      leads: (row.contractor_name || row.event_name)
        ? { contractor_name: row.contractor_name, event_name: row.event_name }
        : null,
      artist: row.artist_nome ? { nome: row.artist_nome } : null
    }));
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

proposalsRouter.post('/seller/proposals', authMiddleware, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const {
      lead_id,
      client_name,
      title,
      artist_id,
      value,
      status,
      file_url,
      observations
    } = req.body;
    const r = await query(
      `insert into proposals
       (seller_id,lead_id,client_name,title,artist_id,value,status,file_url,observations)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       returning *`,
      [
        sellerId,
        lead_id || null,
        client_name || null,
        title || null,
        artist_id || null,
        value || 0,
        status || 'rascunho',
        file_url || null,
        observations || null
      ]
    );
    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

proposalsRouter.put('/seller/proposals/:id', authMiddleware, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;
    const {
      lead_id,
      client_name,
      title,
      artist_id,
      value,
      status,
      file_url,
      observations
    } = req.body;
    const r = await query(
      `update proposals
       set lead_id=$1,
           client_name=$2,
           title=$3,
           artist_id=$4,
           value=$5,
           status=$6,
           file_url=$7,
           observations=$8,
           updated_at=now()
       where id=$9 and seller_id=$10
       returning *`,
      [
        lead_id || null,
        client_name || null,
        title || null,
        artist_id || null,
        value || 0,
        status || 'rascunho',
        file_url || null,
        observations || null,
        id,
        sellerId
      ]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

proposalsRouter.delete('/seller/proposals/:id', authMiddleware, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;
    const r = await query(
      `delete from proposals where id=$1 and seller_id=$2`,
      [id, sellerId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

