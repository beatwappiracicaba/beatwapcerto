import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all producers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nome, u.email, u.telefone, p.bio, p.avatar_url,
             p.instagram, p.youtube, p.spotify, p.soundcloud, p.website,
             p.is_verified, p.cache, p.specialization, p.is_producer
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.cargo = 'Produtor'
      ORDER BY u.created_at DESC
    `);

    res.json({ producers: result.rows });
  } catch (error) {
    console.error('Erro ao buscar produtores:', error);
    res.status(500).json({ error: 'Erro ao buscar produtores' });
  }
});

// Get producer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT u.id, u.nome, u.email, u.telefone, p.bio, p.avatar_url,
             p.instagram, p.youtube, p.spotify, p.soundcloud, p.website,
             p.is_verified, p.cache, p.specialization, p.is_producer,
             p.cpf, p.cnpj, p.address, p.birth_date
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1 AND u.cargo = 'Produtor'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produtor não encontrado' });
    }

    res.json({ producer: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar produtor:', error);
    res.status(500).json({ error: 'Erro ao buscar produtor' });
  }
});

// Get producer services
router.get('/:id/services', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM producer_services 
      WHERE producer_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    res.json({ services: result.rows });
  } catch (error) {
    console.error('Erro ao buscar serviços do produtor:', error);
    res.status(500).json({ error: 'Erro ao buscar serviços do produtor' });
  }
});

// Add producer service
router.post('/:id/services', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId || userId !== id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const {
      service_name, description, price, duration, category, 
      requirements, deliverables, is_available
    } = req.body;

    const result = await pool.query(`
      INSERT INTO producer_services (producer_id, service_name, description, price, 
                                   duration, category, requirements, deliverables, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, service_name, description, price, duration, category, 
        requirements, deliverables, is_available]);

    res.status(201).json({ 
      message: 'Serviço adicionado com sucesso',
      service: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao adicionar serviço:', error);
    res.status(500).json({ error: 'Erro ao adicionar serviço' });
  }
});

export default router;