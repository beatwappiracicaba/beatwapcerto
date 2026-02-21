// src/handlers/analytics.js - Handler de analytics
import { Database } from '../utils/database.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const analyticsHandler = {
  async getArtistEvents(id, env) {
    try {
      const db = new Database(env);
      
      // Buscar eventos do artista
      const eventsResult = await db.queryWithReturn(`
        SELECT 
          event_type,
          COUNT(*) as total,
          DATE(created_at) as date
        FROM public.analytics_events
        WHERE artist_id = $1
        GROUP BY event_type, DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [id]);

      return successResponse(eventsResult.rows, 'Eventos encontrados', 200, env);

    } catch (error) {
      console.error('Get artist events error:', error);
      return errorResponse('Erro ao buscar eventos', 500, env);
    }
  }
};