// src/handlers/profiles.js - Handler de profiles
import { Database } from '../utils/database.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/response.js';

export const profilesHandler = {
  async getById(id, env) {
    try {
      const db = new Database(env);
      
      const result = await db.queryWithReturn(
        'SELECT id, nome, email, cargo, avatar_url, created_at FROM public.profiles WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return errorResponse('Perfil não encontrado', 404, env);
      }

      return successResponse(result.rows[0], 'Perfil encontrado', 200, env);

    } catch (error) {
      console.error('Get profile error:', error);
      return errorResponse('Erro ao buscar perfil', 500, env);
    }
  },

  async getPosts(id, env) {
    try {
      const db = new Database(env);
      
      const result = await db.queryWithReturn(
        'SELECT * FROM public.posts WHERE autor_id = $1 ORDER BY created_at DESC',
        [id]
      );

      return successResponse(result.rows, 'Posts encontrados', 200, env);

    } catch (error) {
      console.error('Get posts error:', error);
      return errorResponse('Erro ao buscar posts', 500, env);
    }
  }
};