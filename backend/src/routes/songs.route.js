import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Rota para buscar músicas do artista autenticado
router.get('/mine', async (req, res) => {
  try {
    // Por enquanto, vamos usar um ID fixo para teste
    // Em produção, você deve obter o ID do artista do token JWT ou sessão
    const artistId = req.query.artist_id || '05c49df8-ec5b-4b90-86f6-2b107d79bf78'; // ID do exemplo
    
    const result = await pool.query(`
      SELECT 
        m.id,
        m.titulo as title,
        m.nome_artista as artist_name,
        m.estilo as genre,
        m.created_at
      FROM public.musics m
      WHERE m.artista_id = $1
      ORDER BY m.created_at DESC
    `, [artistId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar músicas do artista:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar músicas.', error: error.message });
  }
});

// Rota para buscar métricas externas de músicas
router.get('/external-metrics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.title,
        m.plays,
        m.listeners,
        m.revenue,
        p.nome as artist_name
      FROM public.musics m
      JOIN public.profiles p ON m.artist_id = p.id
      WHERE m.plays > 0 OR m.listeners > 0
      ORDER BY m.plays DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar métricas externas:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar métricas externas.' });
  }
});

export default router;