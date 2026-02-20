import express from 'express';
import { query } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

export const messagesRouter = express.Router();

// Rotas existentes de mensagens
messagesRouter.get('/messages', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const r = await query(
      'select id,sender_id,receiver_id,message,created_at from messages where sender_id=$1 or receiver_id=$1 order by created_at desc limit 100',
      [uid]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

messagesRouter.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    const sender_id = req.user.id;
    if (!receiver_id || !message) return res.status(400).json({ error: 'Missing fields' });
    const r = await query(
      'insert into messages (sender_id,receiver_id,message) values ($1,$2,$3) returning id,sender_id,receiver_id,message,created_at',
      [sender_id, receiver_id, message]
    );
    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Rotas para sistema de chat

// Buscar todos os chats do usuário
messagesRouter.get('/chats', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const cargo = req.user.cargo;
    const isAdmin = cargo === 'Produtor';
    const isVendedor = cargo === 'Vendedor';
    const isCompositor = cargo === 'Compositor';

    let q = `
      SELECT c.*, 
             array_agg(DISTINCT p.id) as participant_ids,
             array_agg(DISTINCT p.nome) as participant_names,
             array_agg(DISTINCT p.nome_completo_razao_social) as participant_full_names,
             array_agg(DISTINCT p.avatar_url) as participant_avatars,
             array_agg(DISTINCT p.cargo) as participant_cargos
      FROM chats c
      LEFT JOIN profiles p ON p.id = ANY(c.participant_ids)
      WHERE 1=1
    `;
    const params = [];

    // Filtrar por participante se não for admin/vendedor/compositor
    if (!isAdmin && !isVendedor && !isCompositor) {
      q += ` AND $1 = ANY(c.participant_ids)`;
      params.push(uid);
    }

    q += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const r = await query(q, params);
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Buscar mensagens de um chat específico
messagesRouter.get('/chats/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const uid = req.user.id;

    // Verificar se o usuário tem acesso ao chat
    const chatCheck = await query(
      'SELECT participant_ids FROM chats WHERE id = $1',
      [chatId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    const participantIds = chatCheck.rows[0].participant_ids;
    if (!participantIds.includes(uid)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const r = await query(
      `SELECT m.*, p.nome, p.nome_completo_razao_social, p.avatar_url, p.cargo
       FROM messages m
       LEFT JOIN profiles p ON p.id = m.sender_id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC`,
      [chatId]
    );

    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Criar novo chat
messagesRouter.post('/chats', authMiddleware, async (req, res) => {
  try {
    const { participant_ids, type = 'support', metadata = {} } = req.body;
    const owner_id = req.user.id;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({ error: 'Participantes obrigatórios' });
    }

    const r = await query(
      'INSERT INTO chats (participant_ids, owner_id, type, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
      [participant_ids, owner_id, type, metadata]
    );

    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Atualizar status do chat
messagesRouter.put('/chats/:chatId/status', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { status } = req.body;
    const uid = req.user.id;

    if (!['pending', 'active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Verificar se o usuário tem acesso ao chat
    const chatCheck = await query(
      'SELECT participant_ids FROM chats WHERE id = $1',
      [chatId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    const participantIds = chatCheck.rows[0].participant_ids;
    if (!participantIds.includes(uid)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const r = await query(
      'UPDATE chats SET status = $1 WHERE id = $2 RETURNING *',
      [status, chatId]
    );

    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Atribuir chat a usuário
messagesRouter.put('/chats/:chatId/assign', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const uid = req.user.id;

    const r = await query(
      'UPDATE chats SET assigned_to = $1 WHERE id = $2 RETURNING *',
      [uid, chatId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Fila de suporte
messagesRouter.get('/support-queue', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const r = await query(
      `SELECT sq.*, 
              p.id as requester_id, p.nome, p.nome_completo_razao_social, p.avatar_url, 
              p.genero_musical, p.cidade, p.estado
       FROM support_queue sq
       JOIN profiles p ON p.id = sq.requester_id
       WHERE sq.active = true
       ORDER BY sq.created_at ASC`,
      []
    );

    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Criar solicitação de suporte
messagesRouter.post('/support-queue', authMiddleware, async (req, res) => {
  try {
    const { role_needed, metadata = {} } = req.body;
    const requester_id = req.user.id;

    const r = await query(
      'INSERT INTO support_queue (requester_id, role_needed, metadata) VALUES ($1, $2, $3) RETURNING *',
      [requester_id, role_needed, metadata]
    );

    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Deletar solicitação de suporte
messagesRouter.delete('/support-queue/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.id;

    const r = await query(
      'DELETE FROM support_queue WHERE id = $1 AND requester_id = $2 RETURNING *',
      [id, uid]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Buscar administradores
messagesRouter.get('/admins', authMiddleware, async (req, res) => {
  try {
    const r = await query(
      `SELECT p.id, p.nome, p.nome_completo_razao_social, p.avatar_url, p.cargo,
              os.online, os.updated_at as online_updated_at
       FROM profiles p
       LEFT JOIN online_status os ON os.profile_id = p.id
       WHERE p.cargo = 'Produtor'
       ORDER BY p.nome`,
      []
    );

    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Buscar artistas para vendedores
messagesRouter.get('/artists-for-seller', authMiddleware, async (req, res) => {
  try {
    const r = await query(
      `SELECT id, nome, nome_completo_razao_social, avatar_url, cidade, estado, genero_musical
       FROM profiles
       WHERE cargo IN ('Artista', 'Artist')
       ORDER BY nome`,
      []
    );

    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});
