import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all releases
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.nome as artist_name
      FROM releases r
      JOIN users u ON r.artist_id = u.id
      ORDER BY r.release_date DESC
    `);

    res.json({ releases: result.rows });
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar lançamentos' });
  }
});

// Get release by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, u.nome as artist_name
      FROM releases r
      JOIN users u ON r.artist_id = u.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    res.json({ release: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar lançamento:', error);
    res.status(500).json({ error: 'Erro ao buscar lançamento' });
  }
});

// Create release
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, release_type, release_date, genre, 
      spotify_url, apple_music_url, deezer_url, tidal_url, youtube_url,
      soundcloud_url, bandcamp_url, cover_url, audio_url, video_url,
      isrc, upc, catalog_number, label, distributor, status
    } = req.body;

    const result = await pool.query(`
      INSERT INTO releases (artist_id, title, description, release_type, release_date, genre,
                           spotify_url, apple_music_url, deezer_url, tidal_url, youtube_url,
                           soundcloud_url, bandcamp_url, cover_url, audio_url, video_url,
                           isrc, upc, catalog_number, label, distributor, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [userId, title, description, release_type, release_date, genre,
        spotify_url, apple_music_url, deezer_url, tidal_url, youtube_url,
        soundcloud_url, bandcamp_url, cover_url, audio_url, video_url,
        isrc, upc, catalog_number, label, distributor, status]);

    res.status(201).json({ 
      message: 'Lançamento criado com sucesso',
      release: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao criar lançamento:', error);
    res.status(500).json({ error: 'Erro ao criar lançamento' });
  }
});

// Update release
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, release_type, release_date, genre, 
      spotify_url, apple_music_url, deezer_url, tidal_url, youtube_url,
      soundcloud_url, bandcamp_url, cover_url, audio_url, video_url,
      isrc, upc, catalog_number, label, distributor, status
    } = req.body;

    const result = await pool.query(`
      UPDATE releases 
      SET title = $1, description = $2, release_type = $3, release_date = $4, genre = $5,
          spotify_url = $6, apple_music_url = $7, deezer_url = $8, tidal_url = $9, 
          youtube_url = $10, soundcloud_url = $11, bandcamp_url = $12, cover_url = $13,
          audio_url = $14, video_url = $15, isrc = $16, upc = $17, catalog_number = $18,
          label = $19, distributor = $20, status = $21, updated_at = NOW()
      WHERE id = $22 AND artist_id = $23
      RETURNING *
    `, [title, description, release_type, release_date, genre,
        spotify_url, apple_music_url, deezer_url, tidal_url, youtube_url,
        soundcloud_url, bandcamp_url, cover_url, audio_url, video_url,
        isrc, upc, catalog_number, label, distributor, status, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado ou não autorizado' });
    }

    res.json({ 
      message: 'Lançamento atualizado com sucesso',
      release: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao atualizar lançamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar lançamento' });
  }
});

// Delete release
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const result = await pool.query(
      'DELETE FROM releases WHERE id = $1 AND artist_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado ou não autorizado' });
    }

    res.json({ message: 'Lançamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir lançamento:', error);
    res.status(500).json({ error: 'Erro ao excluir lançamento' });
  }
});

export default router;