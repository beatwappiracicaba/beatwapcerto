import { pool } from '../db.js';
import { getUsersByRoleQuery } from '../models/users.model.js';

export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;
    
    if (!role) {
      return res.status(400).json({ message: 'Parâmetro "role" é obrigatório' });
    }
    
    const { rows } = await pool.query(getUsersByRoleQuery, [role]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar usuários por role:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
