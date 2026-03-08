// src/handlers/admins.js - Handler para listar admins
import { queryWithRetry } from '../database-utils.js';
import { createArrayResponse, createResponse } from '../response.js';

export async function getAdmins(pool, request, decoded) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const result = await queryWithRetry(pool, `
      SELECT 
        p.id,
        p.nome,
        p.email,
        p.avatar_url,
        p.cargo,
        p.created_at,
        p.status,
        p.online_updated_at,
        CASE 
          WHEN p.online_updated_at > NOW() - INTERVAL '5 minutes' THEN true
          ELSE false
        END as online
      FROM profiles p
      WHERE p.cargo = 'Produtor'
      ORDER BY p.nome ASC
      LIMIT 50
    `);

    return createArrayResponse(result.rows, request);
  } catch (error) {
    console.error('Get admins error:', error);
    return createArrayResponse([], request);
  }
}