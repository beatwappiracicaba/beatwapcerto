import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all musics
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.nome as artist_name, u.cargo as artist_role
      FROM musics m
      JOIN users u ON m.artist_id = u.id
      ORDER BY m.created_at DESC
    `);

    res.json({ musics: result.rows });
  } catch (error) {
    console.error('Erro ao buscar músicas:', error);
    res.status(500).json({ error: 'Erro ao buscar músicas' });
  }
});

// Get music by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT m.*, u.nome as artist_name, u.cargo as artist_role
      FROM musics m
      JOIN users u ON m.artist_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }

    res.json({ music: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar música:', error);
    res.status(500).json({ error: 'Erro ao buscar música' });
  }
});

// Create music
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, artist, album, duration, genre, release_date, 
      isrc, spotify_url, youtube_url, soundcloud_url, apple_music_url,
      deezer_url, tidal_url, description, lyrics, produced_by, composed_by,
      written_by, featuring, album_id, cover_url, audio_url
    } = req.body;

    const result = await pool.query(`
      INSERT INTO musics (artist_id, title, artist, album, duration, genre, release_date,
                         isrc, spotify_url, youtube_url, soundcloud_url, apple_music_url,
                         deezer_url, tidal_url, description, lyrics, produced_by, composed_by,
                         written_by, featuring, album_id, cover_url, audio_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `, [userId, title, artist, album, duration, genre, release_date, isrc, spotify_url, 
        youtube_url, soundcloud_url, apple_music_url, deezer_url, tidal_url, description, 
        lyrics, produced_by, composed_by, written_by, featuring, album_id, cover_url, audio_url]);

    res.status(201).json({ 
      message: 'Música criada com sucesso',
      music: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao criar música:', error);
    res.status(500).json({ error: 'Erro ao criar música' });
  }
});

// Update music
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, artist, album, duration, genre, release_date, 
      isrc, spotify_url, youtube_url, soundcloud_url, apple_music_url,
      deezer_url, tidal_url, description, lyrics, produced_by, composed_by,
      written_by, featuring, album_id, cover_url, audio_url
    } = req.body;

    const result = await pool.query(`
      UPDATE musics 
      SET title = $1, artist = $2, album = $3, duration = $4, genre = $5, 
          release_date = $6, isrc = $7, spotify_url = $8, youtube_url = $9, 
          soundcloud_url = $10, apple_music_url = $11, deezer_url = $12, 
          tidal_url = $13, description = $14, lyrics = $15, produced_by = $16, 
          composed_by = $17, written_by = $18, featuring = $19, album_id = $20, 
          cover_url = $21, audio_url = $22, updated_at = NOW()
      WHERE id = $23 AND artist_id = $24
      RETURNING *
    `, [title, artist, album, duration, genre, release_date, isrc, spotify_url, 
        youtube_url, soundcloud_url, apple_music_url, deezer_url, tidal_url, description, 
        lyrics, produced_by, composed_by, written_by, featuring, album_id, cover_url, 
        audio_url, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Música não encontrada ou não autorizada' });
    }

    res.json({ 
      message: 'Música atualizada com sucesso',
      music: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao atualizar música:', error);
    res.status(500).json({ error: 'Erro ao atualizar música' });
  }
});

// Delete music
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const result = await pool.query(
      'DELETE FROM musics WHERE id = $1 AND artist_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Música não encontrada ou não autorizada' });
    }

    res.json({ message: 'Música excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir música:', error);
    res.status(500).json({ error: 'Erro ao excluir música' });
  }
});

export default router;