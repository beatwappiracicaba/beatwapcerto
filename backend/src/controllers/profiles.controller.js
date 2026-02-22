import { pool } from '../db.js';
import { getAllArtistsQuery } from '../models/profiles.model.js';

export const getArtists = async (req, res) => {
  console.log('Recebida requisição para GET /api/profiles/artists');
  try {
    console.log('Executando query:', getAllArtistsQuery);
    const { rows } = await pool.query(getAllArtistsQuery);
    console.log('Query executada com sucesso. Retornando', rows.length, 'artistas.');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Ocorreu um erro ao buscar artistas:', {
      message: error.message,
      stack: error.stack,
      query: getAllArtistsQuery,
    });
    res.status(500).json({ message: 'Erro interno do servidor ao consultar artistas.' });
  }
};
