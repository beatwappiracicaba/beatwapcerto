// src/handlers/chats.js - Handler de chats
import { queryWithRetry } from '../database-utils.js';
import { createArrayResponse, createResponse } from '../response.js';

export async function getChats(pool, request, decoded) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const result = await queryWithRetry(pool, `
      SELECT 
        c.id,
        c.type,
        c.status,
        c.metadata,
        c.created_at,
        c.updated_at,
        c.participant_ids,
        (
          SELECT json_agg(json_build_object(
            'id', p.id,
            'nome', p.nome,
            'avatar_url', p.avatar_url,
            'cargo', p.cargo
          ))
          FROM profiles p 
          WHERE p.id = ANY(c.participant_ids)
        ) as participants
      FROM chats c
      WHERE $1 = ANY(c.participant_ids)
      ORDER BY c.updated_at DESC
      LIMIT 50
    `, [userId]);

    // Buscar últimas mensagens para cada chat
    const chatsWithMessages = await Promise.all(
      result.rows.map(async (chat) => {
        const messagesResult = await queryWithRetry(pool, `
          SELECT 
            m.id,
            m.content,
            m.sender_id,
            m.type,
            m.created_at,
            p.nome as sender_name,
            p.avatar_url as sender_avatar
          FROM messages m
          LEFT JOIN profiles p ON m.sender_id = p.id
          WHERE m.chat_id = $1
          ORDER BY m.created_at DESC
          LIMIT 20
        `, [chat.id]);

        return {
          ...chat,
          messages: messagesResult.rows.reverse()
        };
      })
    );

    return createArrayResponse(chatsWithMessages, request);
  } catch (error) {
    console.error('Get chats error:', error);
    return createArrayResponse([], request);
  }
}

export async function createChat(pool, request, decoded) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const body = await request.json();
    const { participant_ids, type = 'support', metadata = {} } = body;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return createResponse(false, null, 'IDs dos participantes são obrigatórios', 400, request);
    }

    // Verificar se todos os participantes existem
    const participantsResult = await queryWithRetry(pool, `
      SELECT id, nome, cargo 
      FROM profiles 
      WHERE id = ANY($1)
    `, [participant_ids]);

    if (participantsResult.rows.length !== participant_ids.length) {
      return createResponse(false, null, 'Um ou mais participantes não foram encontrados', 400, request);
    }

    const result = await queryWithRetry(pool, `
      INSERT INTO chats (participant_ids, type, status, metadata)
      VALUES ($1, $2, 'active', $3)
      RETURNING *
    `, [participant_ids, type, JSON.stringify(metadata)]);

    return createResponse(true, result.rows[0], null, 200, request);
  } catch (error) {
    console.error('Create chat error:', error);
    return createResponse(false, null, 'Erro ao criar chat', 500, request);
  }
}

export async function updateChatStatus(pool, request, decoded, chatId) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'closed', 'pending'].includes(status)) {
      return createResponse(false, null, 'Status inválido', 400, request);
    }

    const result = await queryWithRetry(pool, `
      UPDATE chats 
      SET status = $1, 
          updated_at = NOW()
      WHERE id = $2 AND $3 = ANY(participant_ids)
      RETURNING *
    `, [status, chatId, userId]);

    if (result.rows.length === 0) {
      return createResponse(false, null, 'Chat não encontrado ou você não tem permissão', 404, request);
    }

    return createResponse(true, result.rows[0], null, 200, request);
  } catch (error) {
    console.error('Update chat status error:', error);
    return createResponse(false, null, 'Erro ao atualizar status do chat', 500, request);
  }
}

export async function assignChat(pool, request, decoded, chatId) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    // Verificar se o usuário é admin/produtor
    const userResult = await queryWithRetry(pool, `
      SELECT cargo FROM profiles WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0 || !['Produtor', 'Admin'].includes(userResult.rows[0].cargo)) {
      return createResponse(false, null, 'Você não tem permissão para atribuir chats', 403, request);
    }

    const result = await queryWithRetry(pool, `
      UPDATE chats 
      SET assigned_to = $1, 
          status = 'active',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [userId, chatId]);

    if (result.rows.length === 0) {
      return createResponse(false, null, 'Chat não encontrado', 404, request);
    }

    return createResponse(true, result.rows[0], null, 200, request);
  } catch (error) {
    console.error('Assign chat error:', error);
    return createResponse(false, null, 'Erro ao atribuir chat', 500, request);
  }
}

export async function deleteChat(pool, request, decoded, chatId) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    // Verificar se o usuário é admin/produtor
    const userResult = await queryWithRetry(pool, `
      SELECT cargo FROM profiles WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0 || !['Produtor', 'Admin'].includes(userResult.rows[0].cargo)) {
      return createResponse(false, null, 'Você não tem permissão para deletar chats', 403, request);
    }

    // Deletar mensagens do chat primeiro
    await queryWithRetry(pool, `
      DELETE FROM messages WHERE chat_id = $1
    `, [chatId]);

    // Deletar o chat
    const result = await queryWithRetry(pool, `
      DELETE FROM chats WHERE id = $1
      RETURNING *
    `, [chatId]);

    if (result.rows.length === 0) {
      return createResponse(false, null, 'Chat não encontrado', 404, request);
    }

    return createResponse(true, { message: 'Chat deletado com sucesso' }, null, 200, request);
  } catch (error) {
    console.error('Delete chat error:', error);
    return createResponse(false, null, 'Erro ao deletar chat', 500, request);
  }
}

export async function markMessagesAsRead(pool, request, decoded, chatId) {
  try {
    const userId = decoded?.id || decoded?.userId;
    if (!userId) {
      return createResponse(false, null, 'Usuário não identificado', 401, request);
    }

    const result = await queryWithRetry(pool, `
      UPDATE messages 
      SET read_at = NOW()
      WHERE chat_id = $1 AND sender_id != $2 AND read_at IS NULL
      RETURNING *
    `, [chatId, userId]);

    return createResponse(true, result.rows, null, 200, request);
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return createResponse(false, null, 'Erro ao marcar mensagens como lidas', 500, request);
  }
}
