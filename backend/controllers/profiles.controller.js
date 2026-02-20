import { pool } from '../db.js';
import { getAllArtistsQuery } from '../models/profiles.model.js';

export const getArtists = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllArtistsQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar artistas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
