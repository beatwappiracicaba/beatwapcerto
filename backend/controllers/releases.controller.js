import { pool } from '../db.js';
import { getAllReleasesQuery } from '../models/releases.model.js';

export const getReleases = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllReleasesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
