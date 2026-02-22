import { pool } from '../db.js';
import { getAllCompositionsQuery } from '../models/compositions.model.js';

export const getCompositions = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllCompositionsQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar composições:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
