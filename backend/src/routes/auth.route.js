import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ 
        message: 'Email e senha são obrigatórios' 
      });
    }

    // Buscar usuário no banco
    const result = await pool.query(
      'SELECT * FROM public.profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        message: 'Credenciais inválidas' 
      });
    }

    const user = result.rows[0];

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(senha, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Credenciais inválidas' 
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        cargo: user.cargo 
      },
      process.env.JWT_SECRET || 'seu-segredo-jwt-aqui',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        avatar_url: user.avatar_url
      }
    });

  } catch (error) {
    console.error('Erro no login:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

export default router;