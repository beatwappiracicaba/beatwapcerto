import express from 'express';
import pool from '../db.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT u.id, u.email, u.nome, u.cargo, u.telefone, u.created_at,
             p.bio, p.avatar_url, p.cpf, p.cnpj, p.address, p.birth_date,
             p.instagram, p.youtube, p.spotify, p.soundcloud, p.website,
             p.is_verified, p.cache, p.specialization
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Update profile
router.put('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      bio, avatar_url, cpf, cnpj, address, birth_date,
      instagram, youtube, spotify, soundcloud, website,
      cache, specialization
    } = req.body;

    // Check if profile exists
    const existingProfile = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    
    let result;
    if (existingProfile.rows.length > 0) {
      // Update existing profile
      result = await pool.query(`
        UPDATE profiles 
        SET bio = $1, avatar_url = $2, cpf = $3, cnpj = $4, address = $5, 
            birth_date = $6, instagram = $7, youtube = $8, spotify = $9, 
            soundcloud = $10, website = $11, cache = $12, specialization = $13,
            updated_at = NOW()
        WHERE user_id = $14
        RETURNING *
      `, [bio, avatar_url, cpf, cnpj, address, birth_date, instagram, youtube, 
           spotify, soundcloud, website, cache, specialization, userId]);
    } else {
      // Create new profile
      result = await pool.query(`
        INSERT INTO profiles (user_id, bio, avatar_url, cpf, cnpj, address, birth_date,
                            instagram, youtube, spotify, soundcloud, website, cache, specialization)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [userId, bio, avatar_url, cpf, cnpj, address, birth_date, instagram, 
           youtube, spotify, soundcloud, website, cache, specialization]);
    }

    res.json({ 
      message: 'Perfil atualizado com sucesso',
      profile: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Get artists
router.get('/artists/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nome, u.cargo, p.bio, p.avatar_url, 
             p.instagram, p.youtube, p.spotify, p.soundcloud, p.website,
             p.is_verified, p.cache, p.specialization
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.cargo = 'Artista'
      ORDER BY u.created_at DESC
    `);

    res.json({ artists: result.rows });
  } catch (error) {
    console.error('Erro ao buscar artistas:', error);
    res.status(500).json({ error: 'Erro ao buscar artistas' });
  }
});

export default router;