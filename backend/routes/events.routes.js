import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, u.nome as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      ORDER BY e.event_date DESC
    `);

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT e.*, u.nome as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    res.status(500).json({ error: 'Erro ao buscar evento' });
  }
});

// Create event
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, event_date, location, venue, capacity, 
      ticket_price, status, cover_url, lineup, requirements
    } = req.body;

    const result = await pool.query(`
      INSERT INTO events (organizer_id, title, description, event_date, location, venue, 
                         capacity, ticket_price, status, cover_url, lineup, requirements)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [userId, title, description, event_date, location, venue, capacity, 
        ticket_price, status, cover_url, lineup, requirements]);

    res.status(201).json({ 
      message: 'Evento criado com sucesso',
      event: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ error: 'Erro ao criar evento' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      title, description, event_date, location, venue, capacity, 
      ticket_price, status, cover_url, lineup, requirements
    } = req.body;

    const result = await pool.query(`
      UPDATE events 
      SET title = $1, description = $2, event_date = $3, location = $4, 
          venue = $5, capacity = $6, ticket_price = $7, status = $8, 
          cover_url = $9, lineup = $10, requirements = $11,
          updated_at = NOW()
      WHERE id = $12 AND organizer_id = $13
      RETURNING *
    `, [title, description, event_date, location, venue, capacity, ticket_price, 
        status, cover_url, lineup, requirements, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado ou não autorizado' });
    }

    res.json({ 
      message: 'Evento atualizado com sucesso',
      event: result.rows[0] 
    });
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    res.status(500).json({ error: 'Erro ao atualizar evento' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND organizer_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado ou não autorizado' });
    }

    res.json({ message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    res.status(500).json({ error: 'Erro ao excluir evento' });
  }
});

export default router;