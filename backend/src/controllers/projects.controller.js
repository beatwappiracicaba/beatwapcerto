import { pool } from '../db.js';
import { getAllProjectsQuery } from '../models/projects.model.js';

export const getProjects = async (req, res) => {
  try {
    const { rows } = await pool.query(getAllProjectsQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
