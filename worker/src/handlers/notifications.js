// src/handlers/notifications.js - Handler de notificações
import { queryWithRetry } from '../database-utils.js';
import { createArrayResponse, createResponse } from '../response.js';

export async function getNotifications(pool, request, decoded) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const result = await queryWithRetry(pool, `
      SELECT 
        n.id,
        n.titulo,
        n.mensagem,
        n.tipo,
        n.lida,
        n.created_at,
        n.metadata
      FROM notifications n
      WHERE n.usuario_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [userId]);

    return createArrayResponse(result.rows, request);
  } catch (error) {
    console.error('Get notifications error:', error);
    return createArrayResponse([], request);
  }
}

export async function createNotification(pool, request, decoded) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const body = await request.json();
    const { titulo, mensagem, tipo = 'info', usuario_id, metadata } = body;

    if (!titulo || !mensagem) {
      return createResponse(false, null, 'Título e mensagem são obrigatórios', 400, request);
    }

    const result = await queryWithRetry(pool, `
      INSERT INTO notifications (titulo, mensagem, tipo, usuario_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [titulo, mensagem, tipo, usuario_id || userId, JSON.stringify(metadata || {})]);

    return createResponse(true, result.rows[0], null, 200, request);
  } catch (error) {
    console.error('Create notification error:', error);
    return createResponse(false, null, 'Erro ao criar notificação', 500, request);
  }
}

export async function markNotificationAsRead(pool, request, decoded, notificationId) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const result = await queryWithRetry(pool, `
      UPDATE notifications 
      SET lida = true, 
          updated_at = NOW()
      WHERE id = $1 AND usuario_id = $2
      RETURNING *
    `, [notificationId, userId]);

    if (result.rows.length === 0) {
      return createResponse(false, null, 'Notificação não encontrada', 404, request);
    }

    return createResponse(true, result.rows[0], null, 200, request);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return createResponse(false, null, 'Erro ao marcar notificação como lida', 500, request);
  }
}

export async function markAllNotificationsAsRead(pool, request, decoded) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    await queryWithRetry(pool, `
      UPDATE notifications 
      SET lida = true, 
      updated_at = NOW()
      WHERE usuario_id = $1 AND lida = false
    `, [userId]);

    return createResponse(true, { message: 'Todas as notificações foram marcadas como lidas' }, null, 200, request);
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return createResponse(false, null, 'Erro ao marcar notificações como lidas', 500, request);
  }
}