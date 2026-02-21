// src/handlers/sponsors.js - Handler de patrocinadores
import { Database } from '../utils/database.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const sponsorsHandler = {
  async getAll(env) {
    try {
      const db = new Database(env);
      
      const result = await db.queryWithReturn(`
        SELECT s.*, perfil.nome as patrocinador_nome
        FROM public.sponsors s
        INNER JOIN public.profiles perfil ON s.patrocinador_id = perfil.id
        ORDER BY s.created_at DESC
      `);

      return successResponse(result.rows, 'Patrocinadores encontrados', 200, env);

    } catch (error) {
      console.error('Get sponsors error:', error);
      return errorResponse('Erro ao buscar patrocinadores', 500, env);
    }
  }
};