import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all sponsors
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM sponsors 
      ORDER BY created_at DESC
    `);

    res.json({ sponsors: result.rows });
  } catch (error) {
    console.error('Erro ao buscar patrocinadores:', error);
    res.status(500).json({ error: 'Erro ao buscar patrocinadores' });
  }
});

// Get sponsor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM sponsors WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patrocinador não encontrado' });
    }

    res.json({ sponsor: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar patrocinador:', error);
    res.status(500).json({ error: 'Erro ao buscar patrocinador' });
  }
});

// Create sponsor
router.post('/', async (req, res) => {
  try {
    const {
      name, description, logo_url, website, contact_email, contact_phone,
      sponsor_type, tier, benefits, requirements, status
    } = req.body;

    const result = await pool.query(`
      INSERT INTO sponsors (name, description, logo_url, website, contact_email, 
                           contact_phone, sponsor_type, tier, benefits, requirements, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [name, description, logo_url, website, contact_email, contact_phone,
        sponsor_type, tier, benefits, requirements, status]);

    res.status(201).json({ 
      message: 'Patrocinador criado com sucesso',
      sponsor: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao criar patrocinador:', error);
    res.status(500).json({ error: 'Erro ao criar patrocinador' });
  }
});

// Update sponsor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const {
      name, description, logo_url, website, contact_email, contact_phone,
      sponsor_type, tier, benefits, requirements, status
    } = req.body;

    const result = await pool.query(`
      UPDATE sponsors 
      SET name = $1, description = $2, logo_url = $3, website = $4, 
          contact_email = $5, contact_phone = $6, sponsor_type = $7, 
          tier = $8, benefits = $9, requirements = $10, status = $11,
          updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [name, description, logo_url, website, contact_email, contact_phone,
        sponsor_type, tier, benefits, requirements, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patrocinador não encontrado' });
    }

    res.json({ 
      message: 'Patrocinador atualizado com sucesso',
      sponsor: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao atualizar patrocinador:', error);
    res.status(500).json({ error: 'Erro ao atualizar patrocinador' });
  }
});

// Delete sponsor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM sponsors WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patrocinador não encontrado' });
    }

    res.json({ message: 'Patrocinador excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir patrocinador:', error);
    res.status(500).json({ error: 'Erro ao excluir patrocinador' });
  }
});

export default router;