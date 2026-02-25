// src/handlers/auth.js - Handler de autenticação
import { Database } from '../utils/database.js';
import { JWT } from '../utils/jwt.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/response.js';
import bcrypt from 'bcryptjs';

export const authHandler = {
  async login(request, env) {
    try {
      const { email, senha, password } = await request.json();
      const pwd = senha ?? password;

      if (!email || !pwd) {
        return errorResponse('Email e senha são obrigatórios', 400, env);
      }

      const db = new Database(env);
      
      // Buscar usuário
      const result = await db.queryWithReturn(
        'SELECT id, nome, email, cargo, password_hash FROM public.profiles WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return errorResponse('Credenciais inválidas', 401, env);
      }

      const user = result.rows[0];

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(pwd, user.password_hash);
      
      if (!isPasswordValid) {
        return errorResponse('Credenciais inválidas', 401, env);
      }

      // Gerar token JWT
      const token = await JWT.sign(
        { 
          userId: user.id, 
          email: user.email, 
          cargo: user.cargo 
        },
        env.JWT_SECRET,
        '24h'
      );

      return successResponse(
        {
          token,
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            cargo: user.cargo
          }
        },
        'Login realizado com sucesso',
        200,
        env
      );

    } catch (error) {
      console.error('Login error:', error);
      return errorResponse('Erro interno do servidor', 500, env);
    }
  }
};
