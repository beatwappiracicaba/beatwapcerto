const express = require('express');
const { auth } = require('../middleware/auth');
const { Profile } = require('../models');

const router = express.Router();

// In-memory stores (simulation for VPS API parity)
const state = {
  chats: [],
  messages: [],
  queue: [],
  notifications: [],
  streams: new Set(),
};

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
  const list = state.notifications.filter(n => String(n.recipient_id) === String(req.user.id));
  res.json(list);
});
router.post('/notifications', auth, async (req, res) => {
  const id = `n_${Date.now()}`;
  const recipient_id = req.body?.recipient_id || req.body?.recipientId || req.user.id;
  const item = {
    id,
    recipient_id,
    title: req.body?.title || 'Notificação',
    message: req.body?.message || '',
    type: req.body?.type || 'info',
    link: req.body?.link || null,
    read: false,
    created_at: nowIso(),
  };
  state.notifications.unshift(item);
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
  const created = recipients.map((rid) => {
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const item = {
      id,
      recipient_id: rid,
      title: req.body?.title || 'Aviso',
      message: req.body?.message || '',
      type: 'info',
      link: req.body?.link || null,
      read: false,
      created_at: nowIso(),
    };
    state.notifications.unshift(item);
    return item;
  });
  res.json({ ok: true, count: created.length });
});
router.post('/notifications/:id/read', auth, async (req, res) => {
  const id = req.params.id;
  const idx = state.notifications.findIndex(n => n.id === id && String(n.recipient_id) === String(req.user.id));
  if (idx < 0) return res.status(404).json({ error: 'Notificação não encontrada' });
  state.notifications[idx] = { ...state.notifications[idx], read: true };
  res.json({ ok: true });
});
router.post('/notifications/read-all', auth, async (req, res) => {
  state.notifications = state.notifications.map(n => String(n.recipient_id) === String(req.user.id) ? { ...n, read: true } : n);
  res.json({ ok: true });
});

// Chats
router.get('/chats', (req, res) => {
  const withMessages = state.chats.map(c => ({
    ...c,
    messages: state.messages.filter(m => m.chat_id === c.id),
  }));
  res.json(withMessages);
});
router.post('/chats', (req, res) => {
  const id = `c_${Date.now()}`;
  const participant_ids = Array.isArray(req.body?.participant_ids) ? req.body.participant_ids : [];
  const chat = {
    id,
    participant_ids,
    participant_names: [],
    participant_avatars: [],
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

// Notifications
router.get('/notifications', auth, (req, res) => {
  const list = state.notifications.filter(n => !n.recipient_id || n.recipient_id === req.user.id);
  res.json(list);
});
router.post('/notifications', auth, (req, res) => {
  const n = {
    id: `n_${Date.now()}`,
    recipient_id: req.body?.recipient_id || req.user?.id || null,
    title: req.body?.title || 'Aviso',
    message: req.body?.message || '',
    link: req.body?.link || null,
    read: false,
    created_at: nowIso(),
  };
  state.notifications.push(n);
  res.json(n);
});
router.post('/broadcast-notifications', auth, (req, res) => {
  const n = {
    id: `n_${Date.now()}`,
    recipient_id: null,
    title: req.body?.title || 'Aviso',
    message: req.body?.message || '',
    link: req.body?.link || null,
    read: false,
    created_at: nowIso(),
  };
  state.notifications.push(n);
  res.json({ ok: true });
});
router.post('/notifications/read-all', auth, (req, res) => {
  state.notifications.forEach(n => {
    if (!n.recipient_id || n.recipient_id === req.user.id) n.read = true;
  });
  res.json({ ok: true });
});

module.exports = router;
