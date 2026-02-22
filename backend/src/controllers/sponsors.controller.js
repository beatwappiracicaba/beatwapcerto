import { pool } from '../db.js';
import { getAllSponsorsQuery } from '../models/sponsors.model.js';

export const getSponsors = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllSponsorsQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar patrocinadores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
