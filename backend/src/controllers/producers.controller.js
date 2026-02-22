import { pool } from '../db.js';
import { getAllProducersQuery } from '../models/producers.model.js';

export const getProducers = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllProducersQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar produtores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
