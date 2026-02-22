import { pool } from '../db.js';
import { getUserByEmailQuery } from '../models/auth.model.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }
    
    const { rows } = await pool.query(getUserByEmailQuery, [email]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    const user = rows[0];
    
    // Aqui você deve adicionar a verificação de senha com bcrypt ou similar
    // Por enquanto, vamos apenas verificar se o usuário existe
    
    res.status(200).json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
