const express = require('express');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { Profile } = require('../models');
const {
  createNotification,
  listNotificationsByRecipient,
  markAsRead,
  markAllAsRead,
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
router.get('/notifications', auth, async (req, res) => {
  const list = listNotificationsByRecipient(req.user?.id);
  res.json(list);
});
router.post('/notifications', auth, async (req, res) => {
  const item = createNotification({
    recipient_id: req.body?.recipient_id || req.body?.recipientId || req.user?.id,
    title: req.body?.title || 'Notificação',
    message: req.body?.message || '',
    type: req.body?.type || 'info',
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
        link: req.body?.link || null,
      })
    )
    .filter(Boolean);
  res.json({ ok: true, count: created.length });
});
router.post('/notifications/:id/read', auth, async (req, res) => {
  const out = markAsRead(req.user?.id, req.params.id);
  if (!out.ok) return res.status(404).json({ error: 'Notificação não encontrada' });
  res.json({ ok: true });
});
router.post('/notifications/read-all', auth, async (req, res) => {
  markAllAsRead(req.user?.id);
  res.json({ ok: true });
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
router.get('/chats', async (req, res) => {
  // Backfill participant names/avatars if missing
  const enriched = [];
  for (const c of state.chats) {
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
router.post('/chats', async (req, res) => {
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
  const id = req.params.id;
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
  chat.assigned_to = req.user?.id || chat.assigned_to || null;
  emitStreamEvent('chat', { action: 'assigned', chatId: id, assigned_to: chat.assigned_to });
  res.json({ ok: true });
});
router.put('/chats/:id/mark-read', auth, (req, res) => {
  const id = req.params.id;
  const msgs = state.messages.filter(m => m.chat_id === id);
  msgs.forEach(m => (m.read = true));
  emitStreamEvent('chat', { action: 'mark_read', chatId: id });
  res.json({ ok: true });
});
router.delete('/chats/:id', auth, (req, res) => {
  const id = req.params.id;
  state.chats = state.chats.filter(c => c.id !== id);
  state.messages = state.messages.filter(m => m.chat_id !== id);
  emitStreamEvent('chat', { action: 'deleted', chatId: id });
  res.json({ ok: true });
});

// Messages
router.get('/messages', (req, res) => {
  res.json(state.messages);
});
router.post('/messages', auth, (req, res) => {
  const chat_id = req.body?.chat_id;
  const chat = state.chats.find(c => c.id === chat_id);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });
  const message = {
    id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    chat_id,
    sender_id: req.body?.sender_id || req.user?.id || null,
    receiver_id: req.body?.receiver_id || null,
    sender_role: req.body?.sender_role || req.user?.cargo || 'Produtor',
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
  emitStreamEvent('typing', { chat_id, user_id: req.user?.id || null, is_typing });
  res.json({ ok: true });
});

module.exports = router;
