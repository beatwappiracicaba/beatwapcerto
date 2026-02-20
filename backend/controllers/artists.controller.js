import { pool } from '../db.js';
import { getAllArtistsQuery } from '../models/artists.model.js';

export const getAllArtists = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllArtistsQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar todos os artistas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
