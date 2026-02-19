import express from 'express';
import { query } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

export const compositionsRouter = express.Router();

// Rota para admin buscar todas as composições
compositionsRouter.get('/admin/compositions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const r = await query(
      `SELECT c.*, p.nome, p.nome_completo_razao_social 
       FROM compositions c
       JOIN profiles p ON c.composer_id = p.id
       ORDER BY c.created_at DESC`,
      []
    );
    // Renomeia os campos para corresponder ao que o frontend espera ('profiles')
    const data = r.rows.map(row => ({
      ...row,
      profiles: {
        nome: row.nome,
        nome_completo_razao_social: row.nome_completo_razao_social
      }
    }));
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Rota para admin atualizar o status de uma composição
compositionsRouter.put('/admin/compositions/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status, feedback } = req.body;

  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    const r = await query(
      'UPDATE compositions SET status = $1, admin_feedback = $2 WHERE id = $3 RETURNING *',
      [status, feedback, id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Composição não encontrada.' });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao atualizar status da composição.' });
  }
});
