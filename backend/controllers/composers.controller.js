import { pool } from '../db.js';
import { getAllComposersQuery } from '../models/composers.model.js';

export const getComposers = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllComposersQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar compositores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
