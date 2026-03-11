import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import releasesRoutes from './releases.route.js';
import profilesRoutes from './profiles.route.js';
import authRoutes from './auth.route.js';
import { authRequired } from '../middleware/auth.js';
import { pool } from '../db.js';
import { listProfiles } from '../models/profiles.model.js';

const router = Router();

router.use(releasesRoutes);
router.use(profilesRoutes);
router.use(authRoutes);

const memory = {
  queue: [],
  chats: [],
  notifications: [],
  artistMetrics: new Map(),
};

const roleMap = {
  artist: 'Artista',
  artista: 'Artista',
  producer: 'Produtor',
  produtor: 'Produtor',
  admin: 'Produtor',
  seller: 'Vendedor',
  vendedor: 'Vendedor',
  composer: 'Compositor',
  compositor: 'Compositor',
};

router.get('/compositions', (req, res) => res.json([]));
router.get('/projects', (req, res) => res.json([]));
router.get('/composers', (req, res) => res.json([]));
router.get('/sponsors', (req, res) => res.json([]));
router.get('/producers', (req, res) => res.json([]));

router.get('/users', authRequired, async (req, res, next) => {
  try {
    const rawRole = req.query && req.query.role ? String(req.query.role).trim().toLowerCase() : '';
    const cargo = rawRole ? (roleMap[rawRole] || null) : null;
    const rows = await listProfiles(pool, { cargo });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/admins', authRequired, async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Produtor' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/artists', authRequired, async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Artista' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/artists-for-seller', authRequired, async (req, res, next) => {
  try {
    const rows = await listProfiles(pool, { cargo: 'Artista' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  const items = memory.notifications.filter((n) => n.recipient_id === userId);
  res.json(items);
});

router.post('/notifications', authRequired, (req, res) => {
  const recipient_id = req.body && (req.body.recipient_id ?? req.body.recipientId) ? String(req.body.recipient_id ?? req.body.recipientId) : '';
  const title = req.body && req.body.title ? String(req.body.title) : '';
  const message = req.body && req.body.message ? String(req.body.message) : '';
  const link = req.body && req.body.link ? String(req.body.link) : null;
  const type = req.body && req.body.type ? String(req.body.type) : null;

  if (!recipient_id || !title || !message) {
    return res.status(400).json({ error: 'recipient_id, title e message são obrigatórios' });
  }

  const n = {
    id: randomUUID(),
    recipient_id,
    title,
    message,
    link,
    type,
    read: false,
    created_at: new Date().toISOString(),
  };
  memory.notifications.unshift(n);
  res.status(201).json(n);
});

router.post('/notifications/read-all', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  memory.notifications = memory.notifications.map((n) => (n.recipient_id === userId ? { ...n, read: true } : n));
  res.json({ ok: true });
});

router.post('/notifications/:id/read', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.notifications = memory.notifications.map((n) => (n.id === id && n.recipient_id === userId ? { ...n, read: true } : n));
  res.json({ ok: true });
});

router.post('/broadcast-notifications', authRequired, (req, res) => {
  const title = req.body && req.body.title ? String(req.body.title) : '';
  const message = req.body && req.body.message ? String(req.body.message) : '';
  const link = req.body && req.body.link ? String(req.body.link) : null;
  const targetRoleRaw = req.body && (req.body.target_role ?? req.body.targetRole) ? String(req.body.target_role ?? req.body.targetRole).trim().toLowerCase() : '';
  const cargo = targetRoleRaw ? (roleMap[targetRoleRaw] || null) : null;

  if (!title || !message) {
    return res.status(400).json({ error: 'title e message são obrigatórios' });
  }

  Promise.resolve()
    .then(async () => {
      const recipients = await listProfiles(pool, { cargo, limit: 500 });
      const nowIso = new Date().toISOString();
      for (const r of recipients) {
        memory.notifications.unshift({
          id: randomUUID(),
          recipient_id: String(r.id),
          title,
          message,
          link,
          type: 'broadcast',
          read: false,
          created_at: nowIso,
        });
      }
      res.json({ ok: true, recipients: recipients.length });
    })
    .catch(() => res.json({ ok: true, recipients: 0 }));
});

router.get('/queue', authRequired, (req, res) => {
  res.json(memory.queue);
});

router.post('/queue', authRequired, (req, res) => {
  const role_needed = req.body && (req.body.role_needed ?? req.body.roleNeeded) ? String(req.body.role_needed ?? req.body.roleNeeded) : null;
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
  const requester_id = req.user && req.user.id ? String(req.user.id) : '';

  const item = {
    id: randomUUID(),
    requester_id,
    role_needed,
    metadata,
    created_at: new Date().toISOString(),
  };
  memory.queue.unshift(item);
  res.status(201).json(item);
});

router.delete('/queue/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.queue = memory.queue.filter((q) => q.id !== id);
  res.json({ ok: true });
});

router.get('/chats', authRequired, (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : '';
  const rows = memory.chats.filter((c) => (c.participant_ids || []).map(String).includes(userId));
  res.json(rows);
});

router.post('/chats', authRequired, (req, res) => {
  const participant_ids = Array.isArray(req.body && req.body.participant_ids) ? req.body.participant_ids.map(String) : [];
  const status = req.body && req.body.status ? String(req.body.status) : 'active';
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

  if (participant_ids.length < 2) {
    return res.status(400).json({ error: 'participant_ids inválido' });
  }

  const existing = memory.chats.find((c) => {
    const a = new Set((c.participant_ids || []).map(String));
    const b = new Set(participant_ids.map(String));
    if (a.size !== b.size) return false;
    for (const id of a) if (!b.has(id)) return false;
    return true;
  });
  if (existing) {
    return res.status(409).json({ error: 'Chat já existe', id: existing.id });
  }

  const chat = {
    id: randomUUID(),
    participant_ids,
    participant_names: [],
    participant_avatars: [],
    status,
    assigned_to: null,
    metadata,
    created_at: new Date().toISOString(),
    messages: [],
  };
  memory.chats.unshift(chat);
  res.status(201).json(chat);
});

router.put('/chats/:id/status', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const status = req.body && req.body.status ? String(req.body.status) : '';
  memory.chats = memory.chats.map((c) => (c.id === id ? { ...c, status: status || c.status } : c));
  res.json({ ok: true });
});

router.put('/chats/:id/assign', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  const userId = req.user && req.user.id ? String(req.user.id) : null;
  memory.chats = memory.chats.map((c) => (c.id === id ? { ...c, assigned_to: userId } : c));
  res.json({ ok: true });
});

router.put('/chats/:id/mark-read', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.chats = memory.chats.map((c) => {
    if (c.id !== id) return c;
    const messages = (c.messages || []).map((m) => ({ ...m, read: true }));
    return { ...c, messages };
  });
  res.json({ ok: true });
});

router.delete('/chats/:id', authRequired, (req, res) => {
  const id = req.params && req.params.id ? String(req.params.id) : '';
  memory.chats = memory.chats.filter((c) => c.id !== id);
  res.json({ ok: true });
});

router.get('/messages', authRequired, (req, res) => {
  const all = memory.chats.flatMap((c) => c.messages || []);
  res.json(all);
});

router.post('/messages', authRequired, (req, res) => {
  const chat_id = req.body && req.body.chat_id ? String(req.body.chat_id) : null;
  const sender_id = req.body && req.body.sender_id ? String(req.body.sender_id) : (req.user && req.user.id ? String(req.user.id) : null);
  const receiver_id = req.body && req.body.receiver_id ? String(req.body.receiver_id) : null;
  const content = req.body && (req.body.message ?? req.body.content) ? String(req.body.message ?? req.body.content) : '';
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

  if (!receiver_id || !content) {
    return res.status(400).json({ error: 'receiver_id e message são obrigatórios' });
  }

  const msg = {
    id: randomUUID(),
    chat_id,
    sender_id,
    receiver_id,
    content,
    message: content,
    read: false,
    created_at: new Date().toISOString(),
    metadata,
    sender_role: metadata && metadata.sender_cargo ? metadata.sender_cargo : null,
  };

  if (chat_id) {
    const idx = memory.chats.findIndex((c) => c.id === chat_id);
    if (idx >= 0) {
      const chat = memory.chats[idx];
      const messages = Array.isArray(chat.messages) ? chat.messages : [];
      const updated = { ...chat, messages: [...messages, msg] };
      memory.chats[idx] = updated;
    }
  }

  res.status(201).json(msg);
});

router.get('/admin/artist/:artistId/metrics', authRequired, (req, res) => {
  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  const m = memory.artistMetrics.get(artistId) || {
    total_plays: 0,
    ouvintes_mensais: 0,
    receita_estimada: 0,
  };
  res.json(m);
});

router.post('/admin/artist/:artistId/metrics', authRequired, (req, res) => {
  const artistId = req.params && req.params.artistId ? String(req.params.artistId) : '';
  const total_plays = Number(req.body && req.body.total_plays ? req.body.total_plays : 0) || 0;
  const ouvintes_mensais = Number(req.body && req.body.ouvintes_mensais ? req.body.ouvintes_mensais : 0) || 0;
  const receita_estimada = Number(req.body && req.body.receita_estimada ? req.body.receita_estimada : 0) || 0;

  const m = { total_plays, ouvintes_mensais, receita_estimada, updated_at: new Date().toISOString() };
  memory.artistMetrics.set(artistId, m);
  res.json(m);
});

export default router;
