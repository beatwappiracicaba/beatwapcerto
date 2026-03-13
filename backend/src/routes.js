const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { config } = require('./config');
const { query } = require('./db');
const { authRequired, requireRole } = require('./middleware/auth');
const { registerClient, emit, sseWrite } = require('./realtime');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function ok(res, data) {
  return res.json({ success: true, data });
}

function bad(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

function normalizeCargo(input) {
  const s = String(input || '').trim().toLowerCase();
  if (!s) return 'Artista';
  if (s === 'admin' || s === 'produtor') return 'Produtor';
  if (s === 'artist' || s === 'artista') return 'Artista';
  if (s === 'seller' || s === 'vendedor') return 'Vendedor';
  if (s === 'composer' || s === 'compositor') return 'Compositor';
  return String(input);
}

function absoluteUploadsUrl(req, relativeUrlPath) {
  const base = `${req.protocol}://${req.get('host')}`;
  if (!relativeUrlPath) return null;
  if (String(relativeUrlPath).startsWith('http://') || String(relativeUrlPath).startsWith('https://')) return relativeUrlPath;
  if (!String(relativeUrlPath).startsWith('/')) return `${base}/${relativeUrlPath}`;
  return `${base}${relativeUrlPath}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safePathPart(v) {
  return String(v || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((p) => p.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = safePathPart(req.body.bucket || req.query.bucket || 'misc');
    const dest = path.join(__dirname, '..', 'uploads', bucket);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const original = String(file.originalname || 'file');
    const ext = path.extname(original).slice(0, 10) || '';
    const fileName = safePathPart(req.body.fileName || req.query.fileName || '');
    if (fileName) return cb(null, fileName.endsWith(ext) ? fileName : `${fileName}${ext}`);
    const name = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => ok(res, { ok: true }));

apiRouter.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const cargo = normalizeCargo(req.body.role || req.body.cargo || 'Artista');
    const plano = req.body.plano == null ? null : String(req.body.plano);

    if (!name || !email || !password) return bad(res, 400, 'Dados inválidos');
    if (!email.includes('@')) return bad(res, 400, 'Email inválido');
    if (password.length < 6) return bad(res, 400, 'Senha muito curta');

    const passwordHash = await bcrypt.hash(password, 10);
    const accessControl = {};

    const { rows } = await query(
      'insert into profiles (email, password_hash, cargo, nome, plano, access_control) values ($1,$2,$3,$4,$5,$6) returning id, email, cargo',
      [email, passwordHash, cargo, name, plano, accessControl]
    );

    const created = rows[0];
    return ok(res, { id: created.id, email: created.email, cargo: created.cargo });
  })
);

apiRouter.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return bad(res, 400, 'Informe email e senha');

    const { rows } = await query(
      'select id, email, cargo, password_hash from profiles where email = $1 limit 1',
      [email]
    );
    const user = rows[0] || null;
    if (!user) return bad(res, 401, 'Credenciais inválidas');
    const okPass = await bcrypt.compare(password, user.password_hash);
    if (!okPass) return bad(res, 401, 'Credenciais inválidas');

    const token = jwt.sign({ sub: String(user.id), role: user.cargo }, config.jwtSecret, { expiresIn: '30d' });
    return ok(res, { token, user: { id: String(user.id), email: user.email, role: user.cargo, cargo: user.cargo } });
  })
);

apiRouter.get(
  '/profile',
  authRequired,
  asyncHandler(async (req, res) => {
    return ok(res, req.profile);
  })
);

apiRouter.get(
  '/profiles',
  asyncHandler(async (req, res) => {
    const includeEmail = !!(req.headers.authorization || req.headers.Authorization);
    const role = String(req.query.role || '').trim().toLowerCase();
    const cargo = role === 'artist' ? 'Artista' : role === 'seller' ? 'Vendedor' : null;
    const sql = cargo
      ? `select id, ${includeEmail ? 'email' : 'null::text as email'}, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control from profiles where cargo = $1 order by created_at desc`
      : `select id, ${includeEmail ? 'email' : 'null::text as email'}, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control from profiles order by created_at desc`;
    const args = cargo ? [cargo] : [];
    const { rows } = await query(sql, args);
    return ok(res, rows);
  })
);

apiRouter.get(
  '/profiles/artists/all',
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "select id, email, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control from profiles where cargo = 'Artista' order by created_at desc",
      []
    );
    return ok(res, rows);
  })
);

apiRouter.get(
  '/profiles/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '');
    const includeEmail = !!(req.headers.authorization || req.headers.Authorization);
    const { rows } = await query(
      `select id, ${includeEmail ? 'email' : 'null::text as email'}, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control, created_at from profiles where id = $1 limit 1`,
      [id]
    );
    if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
    return ok(res, rows[0]);
  })
);

apiRouter.put(
  '/profiles',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = String(req.user.id);
    const payload = req.body || {};
    const nome = payload.nome != null ? String(payload.nome) : null;
    const nomeCompleto = payload.nome_completo_razao_social != null ? String(payload.nome_completo_razao_social) : null;
    const avatarUrl = payload.avatar_url != null ? String(payload.avatar_url) : null;
    const plano = payload.plano != null ? String(payload.plano) : null;

    const { rows } = await query(
      'update profiles set nome = coalesce($2, nome), nome_completo_razao_social = coalesce($3, nome_completo_razao_social), avatar_url = coalesce($4, avatar_url), plano = coalesce($5, plano), updated_at = now() where id = $1 returning id, email, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control',
      [id, nome, nomeCompleto, avatarUrl, plano]
    );
    return ok(res, rows[0] || null);
  })
);

apiRouter.put(
  '/profiles/:id/access-control',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const targetId = String(req.params.id || '');
    const access = req.body && req.body.access_control ? req.body.access_control : null;
    if (!access || typeof access !== 'object') return bad(res, 400, 'access_control inválido');
    const { rows } = await query(
      'update profiles set access_control = $2, updated_at = now() where id = $1 returning id, access_control',
      [targetId, access]
    );
    if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
    return ok(res, rows[0]);
  })
);

apiRouter.post(
  '/admin/users/:id/purge',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '');
    const confirm = String((req.body && req.body.confirm) || '');
    const { rows } = await query('select email from profiles where id = $1 limit 1', [id]);
    const target = rows[0] || null;
    if (!target) return bad(res, 404, 'Usuário não encontrado');
    const expected = `APAGAR ${String(target.email)}`;
    if (confirm !== expected) return bad(res, 400, `Confirmação inválida. Digite: ${expected}`);

    await query('delete from notifications where recipient_id = $1', [id]);
    await query('delete from posts where user_id = $1', [id]);
    await query('delete from messages where sender_id = $1 or receiver_id = $1', [id]);
    await query('delete from chats where $1 = any(participant_ids)', [id]);
    await query('delete from support_queue where requester_id = $1', [id]);
    await query('delete from profiles where id = $1', [id]);

    emit('chat_update', { t: Date.now() });
    emit('queue_update', { t: Date.now() });
    return ok(res, { ok: true });
  })
);

apiRouter.get(
  '/admins',
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "select id, cargo, nome, nome_completo_razao_social, avatar_url, false as online, null::timestamptz as online_updated_at from profiles where cargo = 'Produtor' order by created_at desc",
      []
    );
    return ok(res, rows);
  })
);

apiRouter.get(
  '/artists-for-seller',
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      "select id, email, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control from profiles where cargo = 'Artista' order by created_at desc",
      []
    );
    return ok(res, rows);
  })
);

apiRouter.get(
  '/notifications',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = String(req.user.id);
    const { rows } = await query(
      'select id, recipient_id, title, message, type, link, read, created_at from notifications where recipient_id = $1 order by created_at desc limit 200',
      [userId]
    );
    return ok(res, rows);
  })
);

apiRouter.post(
  '/notifications',
  authRequired,
  asyncHandler(async (req, res) => {
    const recipientId = String(req.body.recipientId || req.body.recipient_id || '');
    const title = String(req.body.title || '').trim();
    const message = String(req.body.message || '').trim();
    const type = req.body.type == null ? null : String(req.body.type);
    const link = req.body.link == null ? null : String(req.body.link);
    if (!recipientId || !title) return bad(res, 400, 'Dados inválidos');
    const { rows } = await query(
      'insert into notifications (recipient_id, title, message, type, link) values ($1,$2,$3,$4,$5) returning id, recipient_id, title, message, type, link, read, created_at',
      [recipientId, title, message, type, link]
    );
    return ok(res, rows[0]);
  })
);

apiRouter.post(
  '/notifications/:id/read',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = String(req.user.id);
    const id = String(req.params.id || '');
    await query('update notifications set read = true where id = $1 and recipient_id = $2', [id, userId]);
    return ok(res, { ok: true });
  })
);

apiRouter.post(
  '/notifications/read-all',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = String(req.user.id);
    await query('update notifications set read = true where recipient_id = $1', [userId]);
    return ok(res, { ok: true });
  })
);

apiRouter.get(
  '/chat/stream',
  authRequired,
  asyncHandler(async (req, res) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    sseWrite(res, 'connected', { t: Date.now() });
    const cleanup = registerClient(res);
    const ping = setInterval(() => {
      try {
        if (!res.writableEnded) sseWrite(res, 'ping', { t: Date.now() });
      } catch {
        void 0;
      }
    }, 25000);
    req.on('close', () => {
      clearInterval(ping);
      cleanup();
    });
  })
);

apiRouter.get(
  '/queue',
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await query('select * from support_queue order by created_at asc', []);
    return ok(res, rows);
  })
);

apiRouter.post(
  '/queue',
  authRequired,
  asyncHandler(async (req, res) => {
    const requesterId = String(req.user.id);
    const roleNeeded = String(req.body.role_needed || '').trim();
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    if (!roleNeeded) return bad(res, 400, 'role_needed é obrigatório');
    const { rows } = await query(
      'insert into support_queue (requester_id, role_needed, metadata) values ($1,$2,$3) returning *',
      [requesterId, roleNeeded, metadata]
    );
    emit('queue_update', { t: Date.now() });
    return ok(res, rows[0]);
  })
);

apiRouter.delete(
  '/queue/:id',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '');
    await query('delete from support_queue where id = $1', [id]);
    emit('queue_update', { t: Date.now() });
    return ok(res, { ok: true });
  })
);

apiRouter.get(
  '/chats',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = String(req.user.id);
    const { rows: chats } = await query(
      'select id, participant_ids, status, assigned_to, owner_id, metadata, created_at from chats where $1 = any(participant_ids) order by updated_at desc nulls last, created_at desc',
      [userId]
    );

    const chatIds = chats.map((c) => String(c.id));
    const messagesByChat = new Map();
    if (chatIds.length) {
      const { rows: msgs } = await query(
        'select m.*, p.nome, p.nome_completo_razao_social, p.cargo as sender_role from messages m left join profiles p on p.id = m.sender_id where m.chat_id = any($1::uuid[]) order by m.created_at asc',
        [chatIds]
      );
      for (const m of msgs) {
        const key = String(m.chat_id);
        if (!messagesByChat.has(key)) messagesByChat.set(key, []);
        messagesByChat.get(key).push(m);
      }
    }

    const enriched = [];
    for (const chat of chats) {
      const ids = Array.isArray(chat.participant_ids) ? chat.participant_ids : [];
      const { rows: participants } = await query(
        'select id, nome, nome_completo_razao_social, avatar_url from profiles where id = any($1::uuid[])',
        [ids]
      );
      const nameById = new Map(participants.map((p) => [String(p.id), p.nome || p.nome_completo_razao_social || null]));
      const avatarById = new Map(participants.map((p) => [String(p.id), p.avatar_url || null]));

      enriched.push({
        ...chat,
        participant_names: ids.map((id) => nameById.get(String(id)) || null),
        participant_avatars: ids.map((id) => avatarById.get(String(id)) || null),
        messages: messagesByChat.get(String(chat.id)) || []
      });
    }

    return ok(res, enriched);
  })
);

apiRouter.post(
  '/chats',
  authRequired,
  asyncHandler(async (req, res) => {
    const participantIdsRaw = Array.isArray(req.body.participant_ids) ? req.body.participant_ids : [];
    const participantIds = Array.from(new Set(participantIdsRaw.map((v) => String(v)))).slice(0, 10);
    if (participantIds.length < 2) return bad(res, 400, 'participant_ids inválido');
    const status = req.body.status != null ? String(req.body.status) : 'active';
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    const ownerId = String(req.user.id);

    const { rows } = await query(
      'insert into chats (participant_ids, status, owner_id, metadata) values ($1,$2,$3,$4) returning *',
      [participantIds, status, ownerId, metadata]
    );
    emit('chat_update', { t: Date.now() });
    return ok(res, rows[0]);
  })
);

apiRouter.put(
  '/chats/:id/status',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '');
    const status = String(req.body.status || '').trim();
    if (!status) return bad(res, 400, 'status é obrigatório');
    const { rows } = await query('update chats set status = $2, updated_at = now() where id = $1 returning *', [id, status]);
    emit('chat_update', { t: Date.now() });
    return ok(res, rows[0] || null);
  })
);

apiRouter.put(
  '/chats/:id/assign',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '');
    const userId = String(req.user.id);
    const { rows } = await query('update chats set assigned_to = $2, updated_at = now() where id = $1 returning *', [id, userId]);
    emit('chat_update', { t: Date.now() });
    return ok(res, rows[0] || null);
  })
);

apiRouter.post(
  '/messages',
  authRequired,
  asyncHandler(async (req, res) => {
    const chatId = String(req.body.chat_id || '');
    const senderId = String(req.user.id);
    const receiverId = req.body.receiver_id != null ? String(req.body.receiver_id) : null;
    const message = String(req.body.message || '').trim();
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    if (!chatId || !message) return bad(res, 400, 'Dados inválidos');

    const { rows } = await query(
      'insert into messages (chat_id, sender_id, receiver_id, content, metadata) values ($1,$2,$3,$4,$5) returning *',
      [chatId, senderId, receiverId, message, metadata]
    );
    emit('chat_update', { t: Date.now(), chat_id: chatId });
    return ok(res, rows[0]);
  })
);

apiRouter.get(
  '/profiles/:id/posts',
  asyncHandler(async (req, res) => {
    const userId = String(req.params.id || '');
    const { rows } = await query(
      'select id, user_id, media_url, media_type, caption, link_url, created_at from posts where user_id = $1 order by created_at desc limit 200',
      [userId]
    );
    return ok(res, rows);
  })
);

apiRouter.post(
  '/posts',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = String(req.body.user_id || req.user.id);
    const mediaUrl = String(req.body.media_url || '').trim();
    const mediaType = String(req.body.media_type || 'image').trim();
    const caption = req.body.caption == null ? null : String(req.body.caption);
    const linkUrl = req.body.link_url == null ? null : String(req.body.link_url);
    if (!userId || !mediaUrl) return bad(res, 400, 'Dados inválidos');

    const { rows } = await query(
      'insert into posts (user_id, media_url, media_type, caption, link_url) values ($1,$2,$3,$4,$5) returning *',
      [userId, mediaUrl, mediaType, caption, linkUrl]
    );
    return ok(res, rows[0]);
  })
);

apiRouter.delete(
  '/posts/:id',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '');
    const userId = String(req.user.id);
    const isAdmin = String(req.profile && req.profile.cargo ? req.profile.cargo : '').toLowerCase() === 'produtor';
    const result = isAdmin
      ? await query('delete from posts where id = $1 returning id', [id])
      : await query('delete from posts where id = $1 and user_id = $2 returning id', [id, userId]);
    if (!result.rows[0]) return bad(res, 404, 'Post não encontrado');
    return ok(res, { ok: true });
  })
);

apiRouter.post(
  '/analytics',
  asyncHandler(async (req, res) => {
    return ok(res, { ok: true });
  })
);

apiRouter.get('/profiles/:id/musics', (req, res) => ok(res, []));
apiRouter.get('/profiles/:id/feats', (req, res) => ok(res, []));
apiRouter.get('/profiles/:id/produced-musics', (req, res) => ok(res, []));
apiRouter.get('/profiles/:id/compositions', (req, res) => ok(res, []));
apiRouter.get('/sellers/:id/stats', (req, res) => ok(res, null));

apiRouter.post('/upload', authRequired, upload.single('file'), (req, res) => {
  const bucket = safePathPart(req.body.bucket || 'misc');
  const relative = `/uploads/${bucket}/${safePathPart(req.file.filename)}`;
  return ok(res, { url: absoluteUploadsUrl(req, relative) });
});

apiRouter.post('/upload/single', authRequired, upload.single('file'), (req, res) => {
  const bucket = safePathPart(req.body.bucket || 'misc');
  const relative = `/uploads/${bucket}/${safePathPart(req.file.filename)}`;
  return ok(res, { url: absoluteUploadsUrl(req, relative) });
});

apiRouter.post('/upload/multiple', authRequired, upload.array('files', 10), (req, res) => {
  const bucket = safePathPart(req.body.bucket || 'misc');
  const urls = (req.files || []).map((f) => absoluteUploadsUrl(req, `/uploads/${bucket}/${safePathPart(f.filename)}`));
  return ok(res, { urls });
});

const emptyListRoutes = [
  'releases',
  'compositions',
  'projects',
  'sponsors',
  'composers',
  'producers',
  'musics',
  'events'
];

for (const name of emptyListRoutes) {
  apiRouter.get(`/${name}`, (req, res) => ok(res, []));
}

apiRouter.get('/albums/:id/tracks', (req, res) => ok(res, []));

module.exports = { apiRouter };
