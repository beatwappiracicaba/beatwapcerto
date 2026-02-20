import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all compositions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.nome as composer_name
      FROM compositions c
      JOIN users u ON c.composer_id = u.id
      ORDER BY c.created_at DESC
    `);

    res.json({ compositions: result.rows });
  } catch (error) {
    console.error('Erro ao buscar composições:', error);
    res.status(500).json({ error: 'Erro ao buscar composições' });
  }
});

// Get composition by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.*, u.nome as composer_name
      FROM compositions c
      JOIN users u ON c.composer_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Composição não encontrada' });
    }

    res.json({ composition: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar composição:', error);
    res.status(500).json({ error: 'Erro ao buscar composição' });
  }
});

// Create composition
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, genre, duration, tempo, key_signature, time_signature,
      mood, instrumentation, lyrics, sheet_music_url, audio_url, video_url,
      copyright_info, isrc, publishing_rights, mechanical_rights, sync_rights
    } = req.body;

    const result = await pool.query(`
      INSERT INTO compositions (composer_id, title, description, genre, duration, tempo, 
                               key_signature, time_signature, mood, instrumentation, 
                               lyrics, sheet_music_url, audio_url, video_url, copyright_info, 
                               isrc, publishing_rights, mechanical_rights, sync_rights)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [userId, title, description, genre, duration, tempo, key_signature, 
        time_signature, mood, instrumentation, lyrics, sheet_music_url, audio_url, 
        video_url, copyright_info, isrc, publishing_rights, mechanical_rights, sync_rights]);

    res.status(201).json({ 
      message: 'Composição criada com sucesso',
      composition: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao criar composição:', error);
    res.status(500).json({ error: 'Erro ao criar composição' });
  }
});

// Update composition
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, genre, duration, tempo, key_signature, time_signature,
      mood, instrumentation, lyrics, sheet_music_url, audio_url, video_url,
      copyright_info, isrc, publishing_rights, mechanical_rights, sync_rights
    } = req.body;

    const result = await pool.query(`
      UPDATE compositions 
      SET title = $1, description = $2, genre = $3, duration = $4, tempo = $5,
          key_signature = $6, time_signature = $7, mood = $8, instrumentation = $9,
          lyrics = $10, sheet_music_url = $11, audio_url = $12, video_url = $13,
          copyright_info = $14, isrc = $15, publishing_rights = $16, 
          mechanical_rights = $17, sync_rights = $18, updated_at = NOW()
      WHERE id = $19 AND composer_id = $20
      RETURNING *
    `, [title, description, genre, duration, tempo, key_signature, time_signature,
        mood, instrumentation, lyrics, sheet_music_url, audio_url, video_url,
        copyright_info, isrc, publishing_rights, mechanical_rights, sync_rights, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Composição não encontrada ou não autorizada' });
    }

    res.json({ 
      message: 'Composição atualizada com sucesso',
      composition: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao atualizar composição:', error);
    res.status(500).json({ error: 'Erro ao atualizar composição' });
  }
});

// Delete composition
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const result = await pool.query(
      'DELETE FROM compositions WHERE id = $1 AND composer_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Composição não encontrada ou não autorizada' });
    }

    res.json({ message: 'Composição excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir composição:', error);
    res.status(500).json({ error: 'Erro ao excluir composição' });
  }
});

export default router;