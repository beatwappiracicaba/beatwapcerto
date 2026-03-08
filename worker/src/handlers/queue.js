// src/handlers/queue.js - Handler de fila
import { queryWithRetry } from '../database-utils.js';
import { createArrayResponse, createResponse } from '../response.js';

export async function getQueue(pool, request, decoded) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    // Buscar itens na fila baseado no cargo do usuário
    const userResult = await queryWithRetry(pool, `
      SELECT cargo FROM profiles WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return createArrayResponse([], request);
    }

    const userRole = userResult.rows[0].cargo;
    let query = '';
    let params = [];

    if (userRole === 'Produtor') {
      // Admin vê toda a fila
      query = `
        SELECT 
          q.id,
          q.type,
          q.status,
          q.priority,
          q.data,
          q.created_at,
          q.updated_at,
          q.processed_by,
          p.nome as created_by_name,
          p.cargo as created_by_role
        FROM queue q
        LEFT JOIN profiles p ON q.created_by = p.id
        WHERE q.status IN ('pending', 'processing')
        ORDER BY q.priority DESC, q.created_at ASC
        LIMIT 100
      `;
    } else if (userRole === 'Artista') {
      // Artistas vêem apenas suas próprias músicas/composições
      query = `
        SELECT 
          q.id,
          q.type,
          q.status,
          q.priority,
          q.data,
          q.created_at,
          q.updated_at,
          q.processed_by,
          p.nome as created_by_name,
          p.cargo as created_by_role
        FROM queue q
        LEFT JOIN profiles p ON q.created_by = p.id
        WHERE q.created_by = $1 
          AND q.type IN ('music_review', 'composition_review')
          AND q.status IN ('pending', 'processing')
        ORDER BY q.priority DESC, q.created_at ASC
        LIMIT 50
      `;
      params = [userId];
    } else {
      // Outros cargos vêem apenas seus próprios itens
      query = `
        SELECT 
          q.id,
          q.type,
          q.status,
          q.priority,
          q.data,
          q.created_at,
          q.updated_at,
          q.processed_by,
          p.nome as created_by_name,
          p.cargo as created_by_role
        FROM queue q
        LEFT JOIN profiles p ON q.created_by = p.id
        WHERE q.created_by = $1 
          AND q.status IN ('pending', 'processing')
        ORDER BY q.priority DESC, q.created_at ASC
        LIMIT 50
      `;
      params = [userId];
    }

    const result = await queryWithRetry(pool, query, params);

    // Processar dados da fila
    const processedQueue = result.rows.map(item => ({
      ...item,
      data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data
    }));

    return createArrayResponse(processedQueue, request);
  } catch (error) {
    console.error('Get queue error:', error);
    return createArrayResponse([], request);
  }
}

export async function deleteQueueItem(pool, request, decoded, queueId) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    // Verificar se o usuário é Produtor ou o dono do item
    const check = await queryWithRetry(pool, `
      SELECT created_by, (SELECT cargo FROM profiles WHERE id = $2) as user_role
      FROM queue WHERE id = $1
    `, [queueId, userId]);

    if (check.rows.length === 0) {
      return createResponse(false, null, 'Item não encontrado', 404, request);
    }

    const item = check.rows[0];
    if (item.created_by !== userId && item.user_role !== 'Produtor') {
      return createResponse(false, null, 'Sem permissão', 403, request);
    }

    await queryWithRetry(pool, `DELETE FROM queue WHERE id = $1`, [queueId]);
    return createResponse(true, { id: queueId }, null, 200, request);
  } catch (error) {
    console.error('Delete queue item error:', error);
    return createResponse(false, null, 'Erro ao deletar item da fila', 500, request);
  }
}
