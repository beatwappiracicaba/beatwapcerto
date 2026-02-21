// src/handlers/admin.js - Handler de admin
import { Database } from '../utils/database.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const adminHandler = {
  async getArtistMetrics(id, env) {
    try {
      const db = new Database(env);
      
      // Buscar métricas do artista
      const metricsResult = await db.queryWithReturn(`
        SELECT 
          COUNT(DISTINCT m.id) as total_musicas,
          COUNT(DISTINCT p.id) as total_projetos,
          COUNT(DISTINCT s.id) as total_composicoes
        FROM public.profiles perfil
        LEFT JOIN public.musics m ON perfil.id = m.artista_id
        LEFT JOIN public.projects p ON perfil.id = p.artista_id
        LEFT JOIN public.compositions s ON perfil.id = s.compositor_id
        WHERE perfil.id = $1
        GROUP BY perfil.id
      `, [id]);

      if (metricsResult.rows.length === 0) {
        return errorResponse('Artista não encontrado', 404, env);
      }

      return successResponse(metricsResult.rows[0], 'Métricas encontradas', 200, env);

    } catch (error) {
      console.error('Get artist metrics error:', error);
      return errorResponse('Erro ao buscar métricas', 500, env);
    }
  }
};