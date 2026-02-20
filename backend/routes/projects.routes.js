import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.nome as artist_name
      FROM projects p
      JOIN users u ON p.artist_id = u.id
      ORDER BY p.created_at DESC
    `);

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ error: 'Erro ao buscar projetos' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.*, u.nome as artist_name
      FROM projects p
      JOIN users u ON p.artist_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ error: 'Erro ao buscar projeto' });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, project_type, budget, deadline, status, priority,
      requirements, deliverables, cover_url, audio_url, video_url
    } = req.body;

    const result = await pool.query(`
      INSERT INTO projects (artist_id, title, description, project_type, budget, deadline, 
                           status, priority, requirements, deliverables, cover_url, 
                           audio_url, video_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [userId, title, description, project_type, budget, deadline, status, 
        priority, requirements, deliverables, cover_url, audio_url, video_url]);

    res.status(201).json({ 
      message: 'Projeto criado com sucesso',
      project: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ error: 'Erro ao criar projeto' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, project_type, budget, deadline, status, priority,
      requirements, deliverables, cover_url, audio_url, video_url
    } = req.body;

    const result = await pool.query(`
      UPDATE projects 
      SET title = $1, description = $2, project_type = $3, budget = $4, 
          deadline = $5, status = $6, priority = $7, requirements = $8, 
          deliverables = $9, cover_url = $10, audio_url = $11, video_url = $12,
          updated_at = NOW()
      WHERE id = $13 AND artist_id = $14
      RETURNING *
    `, [title, description, project_type, budget, deadline, status, priority,
        requirements, deliverables, cover_url, audio_url, video_url, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado ou não autorizado' });
    }

    res.json({ 
      message: 'Projeto atualizado com sucesso',
      project: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ error: 'Erro ao atualizar projeto' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND artist_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado ou não autorizado' });
    }

    res.json({ message: 'Projeto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    res.status(500).json({ error: 'Erro ao excluir projeto' });
  }
});

export default router;