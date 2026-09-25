const express = require('express');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { Profile } = require('../models');
const {
  createNotification,
  listNotificationsByRecipient,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require('../services/notifications');
const { memory } = require('../memoryStore');

const router = express.Router();

// In-memory stores (simulation for VPS API parity)
const state = {
  chats: [],
  messages: [],
  queue: [],
  notifications: [],
  streams: new Set(),
  aiHistory: [],
};

function purgeUserChatData(userIdRaw) {
  const userId = String(userIdRaw || '').trim();
  if (!userId) return;

  const removedChatIds = new Set();
  state.chats = (Array.isArray(state.chats) ? state.chats : []).filter((c) => {
    const ids = Array.isArray(c?.participant_ids) ? c.participant_ids : [];
    const has = ids.map((x) => String(x)).includes(userId);
    if (has && c?.id) removedChatIds.add(String(c.id));
    return !has;
  });

  state.messages = (Array.isArray(state.messages) ? state.messages : []).filter((m) => {
    const chatId = String(m?.chat_id || '').trim();
    if (chatId && removedChatIds.has(chatId)) return false;
    const sender = String(m?.sender_id || '').trim();
    const receiver = String(m?.receiver_id || '').trim();
    if (sender === userId || receiver === userId) return false;
    return true;
  });

  state.queue = (Array.isArray(state.queue) ? state.queue : []).filter((q) => String(q?.requester_id || '').trim() !== userId);
  memory.notifications = (Array.isArray(memory.notifications) ? memory.notifications : []).filter((n) => String(n?.recipient_id || '').trim() !== userId);
  state.aiHistory = (Array.isArray(state.aiHistory) ? state.aiHistory : []).filter((h) => String(h?.user_id || '').trim() !== userId);
}

router.purgeUserChatData = purgeUserChatData;

function nowIso() {
  return new Date().toISOString();
}

function emitStreamEvent(event, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  for (const res of state.streams) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${payload}\n\n`);
    } catch {
      // ignore
    }
  }
}

// SSE stream for chat updates
router.get('/chat/stream', auth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial ping
  res.write(`event: hello\n`);
  res.write(`data: ${JSON.stringify({ ok: true, ts: nowIso() })}\n\n`);

  state.streams.add(res);
  const keepalive = setInterval(() => {
    try {
      res.write(`event: ping\n`);
      res.write(`data: ${JSON.stringify({ ts: nowIso() })}\n\n`);
    } catch {
      // ignore
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepalive);
    state.streams.delete(res);
  });
});

// Admins list (Produtores)
router.get('/admins', async (req, res) => {
  const admins = await Profile.findAll({ where: { cargo: 'Produtor' } });
  const mapped = admins.map(a => ({
    id: a.id,
    nome: a.nome || 'Produtor',
    avatar_url: a.avatar_url || null,
    online: true,
    online_updated_at: nowIso(),
  }));
  res.json(mapped);
});

// Support queue
router.get('/queue', (req, res) => {
  res.json(state.queue);
});
router.post('/queue', (req, res) => {
  const id = `q_${Date.now()}`;
  const item = {
    id,
    requester_id: req.body?.metadata?.requester_id || req.body?.requester_id || null,
    role_needed: req.body?.role_needed || 'Produtor',
    metadata: req.body?.metadata || {},
    created_at: nowIso(),
    status: 'open',
  };
  state.queue.push(item);
  emitStreamEvent('queue', { action: 'created', item });
  res.json(item);
});

// Notifications
//
// Cada contexto e consultado separado no servidor: `?context=feed` devolve
// somente interacoes sociais e `?context=admin` somente avisos de plataforma.
// Pedir `admin` exige cargo administrativo (comprovado aqui, nao no front).
const ADMIN_CARGOS = ['produtor', 'vendedor'];

function isAdminCargo(cargo) {
  return ADMIN_CARGOS.includes(String(cargo || '').trim().toLowerCase());
}

router.get('/notifications', auth, async (req, res) => {
  const requested = String(req.query?.context || '').trim().toLowerCase();
  const admin = isAdminCargo(req.user?.cargo);

  if (requested === 'admin' && !admin) {
    return res.status(403).json({ error: 'Acesso restrito a notificacoes administrativas' });
  }

  const context = requested === 'admin' ? 'admin' : (requested === 'feed' ? 'feed' : null);
  const list = listNotificationsByRecipient(req.user?.id, context);
  res.json(list);
});

router.post('/notifications', auth, async (req, res) => {
  const requested = String(req.body?.context || '').trim().toLowerCase();
  if (requested === 'admin' && !isAdminCargo(req.user?.cargo)) {
    return res.status(403).json({ error: 'Acesso restrito a notificacoes administrativas' });
  }
  const item = createNotification({
    recipient_id: req.body?.recipient_id || req.body?.recipientId || req.user?.id,
    title: req.body?.title || 'Notificação',
    message: req.body?.message || '',
    type: req.body?.type || 'info',
    context: requested,
    link: req.body?.link || null,
  });
  if (!item) return res.status(400).json({ error: 'recipient_id obrigatório' });
  res.json(item);
});
router.post('/broadcast-notifications', auth, async (req, res) => {
  const targetRole = req.body?.target_role || null;
  let recipients = [];
  try {
    if (targetRole) {
      const rows = await Profile.findAll({ where: { cargo: targetRole } });
      recipients = rows.map(r => r.id);
    } else {
      const rows = await Profile.findAll();
      recipients = rows.map(r => r.id);
    }
  } catch { recipients = []; }
  const created = recipients
    .map((rid) =>
      createNotification({
        recipient_id: rid,
        title: req.body?.title || 'Aviso',
        message: req.body?.message || '',
        type: 'info',
        context: 'admin',
        link: req.body?.link || null,
      })
    )
    .filter(Boolean);
  res.json({ ok: true, count: created.length });
});
router.post('/notifications/:id/read', auth, async (req, res) => {
  // A leitura e por contexto: so a notificacao pedida e marcada, e o
  // contador recalculado apenas dentro daquele contexto.
  const out = markAsRead(req.user?.id, req.params.id);
  if (!out.ok) return res.status(404).json({ error: 'Notificação não encontrada' });
  const context = String(req.query?.context || req.body?.context || '').trim().toLowerCase() || null;
  res.json({ ok: true, unread_count: getUnreadCount(req.user?.id, context) });
});
router.post('/notifications/read-all', auth, async (req, res) => {
  const requested = String(req.query?.context || req.body?.context || '').trim().toLowerCase();
  if (requested === 'admin' && !isAdminCargo(req.user?.cargo)) {
    return res.status(403).json({ error: 'Acesso restrito a notificacoes administrativas' });
  }
  const context = requested === 'admin' ? 'admin' : (requested === 'feed' ? 'feed' : null);
  markAllAsRead(req.user?.id, context);
  res.json({ ok: true, unread_count: getUnreadCount(req.user?.id, context) });
});

// AI Assistant (history + chat)
router.get('/ai/history', auth, (req, res) => {
  const uid = String(req.user?.id || '');
  const rows = state.aiHistory.filter(h => String(h.user_id) === uid).slice(-100);
  res.json(rows);
});
router.post('/ai/history', auth, (req, res) => {
  const uid = String(req.user?.id || '');
  const role = String(req.body?.role || '').toLowerCase() === 'assistant' ? 'assistant' : 'user';
  const content = String(req.body?.content || '');
  const item = {
    id: `ai_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    user_id: uid,
    role,
    content,
    created_at: nowIso(),
  };
  state.aiHistory.push(item);
  res.json(item);
});
router.post('/ai/history/clear', auth, (req, res) => {
  const uid = String(req.user?.id || '');
  state.aiHistory = state.aiHistory.filter(h => String(h.user_id) !== uid);
  res.json({ ok: true });
});
router.post('/ai/chat', auth, async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY ausente no servidor' });
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages.map(m => ({ role: m.role, content: String(m.content || '') })).slice(-30),
      temperature: 0.6,
      top_p: 0.95,
      n: 1,
      stream: false,
    };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await r.json();
    if (!r.ok) {
      const msg = json?.error?.message || r.statusText || 'Falha na IA';
      return res.status(r.status).json({ error: msg });
    }
    const reply = json?.choices?.[0]?.message?.content || '';
    const uid = String(req.user?.id || '');
    state.aiHistory.push({ id: `ai_${Date.now()}r`, user_id: uid, role: 'assistant', content: reply, created_at: nowIso() });
    return res.json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao consultar IA' });
  }
});

// Chats
//
// Autorizacao (validada no servidor, nunca so no front):
//   - administrador (produtor/vendedor) enxerga todas as conversas;
//   - usuario comum so enxerga as conversas de que participa.
// O `context` separa o chat administrativo do Chat Social do Feed.
const CHAT_CONTEXT_ADMIN = 'admin';
const CHAT_CONTEXT_SOCIAL = 'social';

function isChatAdmin(cargo) {
  return ['produtor', 'vendedor'].includes(String(cargo || '').trim().toLowerCase());
}

function chatContextOf(chat) {
  const v = String(chat?.context || '').trim().toLowerCase();
  return v === CHAT_CONTEXT_SOCIAL ? CHAT_CONTEXT_SOCIAL : CHAT_CONTEXT_ADMIN;
}

function isParticipant(chat, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return false;
  return (Array.isArray(chat?.participant_ids) ? chat.participant_ids : []).some(
    (id) => String(id || '').trim() === uid
  );
}

// Admin passa direto NAS CONVERSAS ADMINISTRATIVAS. No Chat Social a regra e
// sempre a mesma: so participa conversa. Nem produtor nem vendedor le a
// conversa privada de duas outras pessoas.
function canAccessChat(chat, user) {
  if (!chat) return false;
  if (chatContextOf(chat) === CHAT_CONTEXT_SOCIAL) {
    return isParticipant(chat, user?.id);
  }
  if (isChatAdmin(user?.cargo)) return true;
  return isParticipant(chat, user?.id);
}

router.get('/chats', auth, async (req, res) => {
  const requested = String(req.query?.context || '').trim().toLowerCase();
  const want = requested === CHAT_CONTEXT_SOCIAL ? CHAT_CONTEXT_SOCIAL
    : (requested === CHAT_CONTEXT_ADMIN ? CHAT_CONTEXT_ADMIN : null);
  const admin = isChatAdmin(req.user?.cargo);

  if (want === CHAT_CONTEXT_ADMIN && !admin) {
    return res.status(403).json({ error: 'Acesso restrito ao chat administrativo' });
  }

  // Chat Social: o usuario so enxerga o que participa, sem excecao por cargo.
  // Chat administrativo: o admin ve todas, o resto so as suas.
  const visible = state.chats.filter((c) => {
    if (want && chatContextOf(c) !== want) return false;
    return canAccessChat(c, req.user);
  });

  // Backfill participant names/avatars if missing
  const enriched = [];
  for (const c of visible) {
    const ids = Array.isArray(c.participant_ids) ? c.participant_ids : [];
    let names = Array.isArray(c.participant_names) ? [...c.participant_names] : [];
    let avatars = Array.isArray(c.participant_avatars) ? [...c.participant_avatars] : [];
    if (names.length !== ids.length || avatars.length !== ids.length || names.some(n => !n)) {
      try {
        const rows = ids.length
          ? await Profile.findAll({ where: { id: { [Op.in]: ids } } })
          : [];
        const byId = new Map(rows.map(r => [String(r.id), r]));
        names = ids.map(id => {
          const p = byId.get(String(id));
          return p?.nome || p?.nome_completo_razao_social || 'Usuário';
        });
        avatars = ids.map(id => {
          const p = byId.get(String(id));
          return p?.avatar_url || null;
        });
      } catch {
        names = ids.map(() => 'Usuário');
        avatars = ids.map(() => null);
      }
      // Cache back into state
      c.participant_names = names;
      c.participant_avatars = avatars;
    }
    enriched.push({
      ...c,
      participant_names: names,
      participant_avatars: avatars,
      messages: state.messages.filter(m => m.chat_id === c.id),
    });
  }
  res.json(enriched);
});
router.post('/chats', auth, async (req, res) => {
  const requested = String(req.body?.context || '').trim().toLowerCase();
  if (requested === CHAT_CONTEXT_SOCIAL) {
    // Chat Social: conversa direta entre dois usuarios cadastrados.
    const other = String(req.body?.participant_id || req.body?.user_id || '').trim();
    const me = String(req.user?.id || '').trim();
    if (!me) return res.status(401).json({ error: 'Não autorizado' });
    if (!other) return res.status(400).json({ error: 'participante obrigatório' });
    if (other === me) {
      return res.status(400).json({ error: 'Você não pode iniciar conversa com você mesmo' });
    }
    const alvo = await Profile.findByPk(other);
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Reaproveita a conversa existente entre as duas pessoas, em qualquer
    // ordem, para nao duplicar.
    const existing = state.chats.find((c) => {
      if (chatContextOf(c) !== CHAT_CONTEXT_SOCIAL) return false;
      const ids = (Array.isArray(c.participant_ids) ? c.participant_ids : []).map((x) => String(x || '').trim());
      return ids.length === 2 && ids.includes(me) && ids.includes(other);
    });
    if (existing) return res.json(existing);

    const participants = [me, other];
    const rows = await Profile.findAll({ where: { id: { [Op.in]: participants } } });
    const byId = new Map(rows.map((r) => [String(r.id), r]));
    const chat = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      context: CHAT_CONTEXT_SOCIAL,
      participant_ids: participants,
      participant_names: participants.map((pid) => byId.get(pid)?.nome || 'Usuário'),
      participant_avatars: participants.map((pid) => byId.get(pid)?.avatar_url || null),
      metadata: {},
      status: 'open',
      assigned_to: null,
      created_at: nowIso(),
    };
    state.chats.push(chat);
    return res.json(chat);
  }

  const id = `c_${Date.now()}`;
  const participant_ids = Array.isArray(req.body?.participant_ids) ? req.body.participant_ids : [];
  let participant_names = [];
  let participant_avatars = [];
  try {
    if (participant_ids.length) {
      const rows = await Profile.findAll({ where: { id: { [Op.in]: participant_ids } } });
      const byId = new Map(rows.map(r => [String(r.id), r]));
      participant_names = participant_ids.map(pid => {
        const p = byId.get(String(pid));
        return p?.nome || p?.nome_completo_razao_social || 'Usuário';
      });
      participant_avatars = participant_ids.map(pid => {
        const p = byId.get(String(pid));
        return p?.avatar_url || null;
      });
    }
  } catch {
    participant_names = participant_ids.map(() => 'Usuário');
    participant_avatars = participant_ids.map(() => null);
  }
  const chat = {
    id,
    context: CHAT_CONTEXT_ADMIN,
    participant_ids,
    participant_names,
    participant_avatars,
    metadata: req.body?.metadata || {},
    status: 'open',
    assigned_to: null,
    created_at: nowIso(),
  };
  state.chats.push(chat);
  emitStreamEvent('chat', { action: 'created', chat });
  res.json(chat);
});
router.put('/chats/:id/assign', auth, (req, res) => {
  if (!isChatAdmin(req.user?.cargo)) {
    return res.status(403).json({ error: 'Somente administradores atribuem conversas' });
  }
  const id = req.params.id;
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
  chat.assigned_to = req.user?.id || chat.assigned_to || null;
  emitStreamEvent('chat', { action: 'assigned', chatId: id, assigned_to: chat.assigned_to });
  res.json({ ok: true });
});
router.put('/chats/:id/mark-read', auth, (req, res) => {
  const id = req.params.id;
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
  if (!canAccessChat(chat, req.user)) {
    return res.status(403).json({ error: 'Você não participa desta conversa' });
  }
  const msgs = state.messages.filter(m => m.chat_id === id);
  msgs.forEach(m => (m.read = true));
  emitStreamEvent('chat', { action: 'mark_read', chatId: id });
  res.json({ ok: true });
});
router.delete('/chats/:id', auth, (req, res) => {
  const id = req.params.id;
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
  // Quem apaga e o admin ou um dos participantes.
  if (!canAccessChat(chat, req.user)) {
    return res.status(403).json({ error: 'Você não participa desta conversa' });
  }
  state.chats = state.chats.filter(c => c.id !== id);
  state.messages = state.messages.filter(m => m.chat_id !== id);
  emitStreamEvent('chat', { action: 'deleted', chatId: id });
  res.json({ ok: true });
});

// Messages
router.get('/messages', auth, (req, res) => {
  // So devolve mensagens das conversas que o usuario pode acessar.
  const chatId = String(req.query?.chat_id || '').trim();
  const allowed = (c) => canAccessChat(c, req.user);
  if (chatId) {
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
    if (!allowed(chat)) {
      return res.status(403).json({ error: 'Você não participa desta conversa' });
    }
    return res.json(state.messages.filter((m) => m.chat_id === chatId));
  }
  const visible = new Set(
    state.chats.filter(allowed).map((c) => c.id)
  );
  res.json(state.messages.filter((m) => visible.has(m.chat_id)));
});
router.post('/messages', auth, (req, res) => {
  const chat_id = req.body?.chat_id;
  const chat = state.chats.find(c => c.id === chat_id);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
  // Nao basta estar autenticado: e preciso participar da conversa.
  if (!canAccessChat(chat, req.user)) {
    return res.status(403).json({ error: 'Você não participa desta conversa' });
  }
  const message = {
    id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    chat_id,
    // O remetente e sempre o usuario autenticado. Aceitar sender_id do
    // body permitiria fingir ser outra pessoa.
    sender_id: req.user?.id || null,
    receiver_id: req.body?.receiver_id || null,
    sender_role: req.user?.cargo || 'Produtor',
    content: req.body?.content || req.body?.message || '',
    read: false,
    metadata: req.body?.metadata || {},
    created_at: nowIso(),
  };
  state.messages.push(message);
  emitStreamEvent('message', { chat_id, message });
  res.json(message);
});

// Typing indicator broadcast
router.post('/typing', auth, (req, res) => {
  const chat_id = req.body?.chat_id || req.body?.chatId;
  const is_typing = !!(req.body?.is_typing ?? req.body?.isTyping);
  if (!chat_id) return res.status(400).json({ error: 'chat_id obrigatório' });
  const chat = state.chats.find((c) => c.id === chat_id);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
  if (!canAccessChat(chat, req.user)) {
    return res.status(403).json({ error: 'Você não participa desta conversa' });
  }
  emitStreamEvent('typing', { chat_id, user_id: req.user?.id || null, is_typing });
  res.json({ ok: true });
});

module.exports = router;
