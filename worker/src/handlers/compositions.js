// src/handlers/compositions.js - Handler de composições
import { Database } from '../utils/database.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const compositionsHandler = {
  async getAll(env) {
    try {
      const db = new Database(env);
      
      const result = await db.queryWithReturn(`
        SELECT c.*, perfil.nome as compositor_nome
        FROM public.compositions c
        INNER JOIN public.profiles perfil ON c.compositor_id = perfil.id
        ORDER BY c.created_at DESC
      `);

      return successResponse(result.rows, 'Composições encontradas', 200, env);

    } catch (error) {
      console.error('Get compositions error:', error);
      return errorResponse('Erro ao buscar composições', 500, env);
    }
  }
};