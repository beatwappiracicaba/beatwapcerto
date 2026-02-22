import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Rota para buscar eventos de analytics de um artista
router.get('/artist/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        e.*,
        p.nome as artist_name
      FROM public.events e
      JOIN public.profiles p ON e.artist_id = p.id
      WHERE e.artist_id = $1
      ORDER BY e.event_date DESC
      LIMIT 50
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar eventos de analytics:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar eventos de analytics.' });
  }
});

export default router;