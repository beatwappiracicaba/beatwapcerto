// src/handlers/songs.js - Handler de músicas
import { Database } from '../utils/database.js';
import { jsonResponse, errorResponse } from '../utils/response.js';

export const songsHandler = {
  async getMine(request, env) {
    try {
      // Extrair token do header Authorization
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse('Token não fornecido', 401, env);
      }

      const token = authHeader.split(' ')[1];
      
      // Verificar token (simplificado - você pode usar JWT.verify aqui)
      const db = new Database(env);
      
      // Buscar músicas do usuário autenticado
      const result = await db.queryWithReturn(`
        SELECT m.*, perfil.nome as artista_nome
        FROM public.musics m
        INNER JOIN public.profiles perfil ON m.artista_id = perfil.id
        WHERE m.artista_id = (
          SELECT id FROM public.profiles 
          WHERE email = $1 
          LIMIT 1
        )
        ORDER BY m.created_at DESC
      `, ['alangodoygtr@gmail.com']); // Temporário - usar JWT depois

      return jsonResponse(result.rows, 200, env);

    } catch (error) {
      console.error('Get my songs error:', error);
      return errorResponse('Erro ao buscar músicas', 500, env);
    }
  }
};