import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Rota para buscar dados de um perfil específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, nome, email, cargo, avatar_url, bio, created_at FROM public.profiles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Perfil não encontrado' 
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor ao buscar perfil' 
    });
  }
});

// Rota para buscar posts de um perfil
router.get('/:id/posts', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.id,
        p.titulo,
        p.conteudo,
        p.imagem_url,
        p.created_at,
        pr.nome as autor_nome,
        pr.avatar_url as autor_avatar
       FROM public.posts p
       JOIN public.profiles pr ON p.autor_id = pr.id
       WHERE p.autor_id = $1
       ORDER BY p.created_at DESC`,
      [id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor ao buscar posts' 
    });
  }
});

export default router;