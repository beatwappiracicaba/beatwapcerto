import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Rota para buscar métricas de um artista específico
router.get('/artist/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar métricas do artista
    const metricsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.id) as total_musicas,
        COALESCE(SUM(m.plays), 0) as total_plays,
        COALESCE(SUM(m.listeners), 0) as total_listeners,
        COALESCE(SUM(m.revenue), 0) as total_revenue
      FROM public.musics m
      WHERE m.artist_id = $1
    `, [id]);

    // Buscar eventos do artista
    const eventsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COALESCE(SUM(revenue), 0) as total_event_revenue
      FROM public.events 
      WHERE artist_id = $1
    `, [id]);

    const metrics = {
      musicas: metricsResult.rows[0] || { total_musicas: 0, total_plays: 0, total_listeners: 0, total_revenue: 0 },
      eventos: eventsResult.rows[0] || { total_events: 0, total_event_revenue: 0 }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas do artista:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar métricas do artista.' });
  }
});

export default router;