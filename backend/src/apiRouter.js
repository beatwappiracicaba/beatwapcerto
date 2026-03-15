// API principal reescrita de forma modular, segura e compatível com o banco existente
// - Autenticação via JWT (usa middlewares existentes: authRequired, requireRole)
// - Paginação, cache público, SSE e logs estruturados
// - Upload seguro com Multer e criação automática de diretórios
// - Retorno consistente: { ok: true/false, data?, message?/error? }

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { query } = require('./db');
const { authRequired, requireRole } = require('./middleware/auth');
const { registerClient, emit, sseWrite } = require('./realtime');

// Utilitários base
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function ok(res, data) {
  return res.json({ ok: true, data });
}
function bad(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}
function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}
function clampInt(v, { min, max, fallback }) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function parsePagination(req, { defaultLimit, maxLimit }) {
  const limit = clampInt(req.query.limit, { min: 1, max: maxLimit, fallback: defaultLimit });
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 });
  return { limit, offset };
}
async function timedQuery(req, sql, params, label) {
  const start = nowMs();
  const result = await query(sql, params);
  const ms = nowMs() - start;
  if (req) {
    req._perf = req._perf || { startMs: start, queries: [] };
    req._perf.queries.push({ label: label || null, ms, rowCount: typeof result.rowCount === 'number' ? result.rowCount : null });
  }
  return result;
}
function withPublicCache(ttlMs, handler) {
  const cache = new Map();
  return asyncHandler(async (req, res, next) => {
    const hasAuth = !!(req.headers.authorization || req.headers.Authorization);
    const isPerf = String(req.query.perf || '') === '1';
    if (hasAuth || req.method !== 'GET') return handler(req, res, next);
    if (isPerf) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Cache', 'BYPASS');
      return handler(req, res, next);
    }
    const key = String(req.originalUrl || req.url || '');
    const entry = cache.get(key);
    if (entry && entry.expiresAtMs > Date.now()) {
      res.setHeader('Cache-Control', `public, max-age=${Math.max(0, Math.floor(ttlMs / 1000))}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(entry.payload);
    }
    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, { expiresAtMs: Date.now() + ttlMs, payload });
      }
      res.setHeader('Cache-Control', `public, max-age=${Math.max(0, Math.floor(ttlMs / 1000))}`);
      res.setHeader('X-Cache', 'MISS');
      return originalJson(payload);
    };
    return handler(req, res, next);
  });
}

// Upload seguro (Multer)
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
function absoluteUploadsUrl(req, relativeUrlPath) {
  const base = `${req.protocol}://${req.get('host')}`;
  if (!relativeUrlPath) return null;
  if (String(relativeUrlPath).startsWith('http://') || String(relativeUrlPath).startsWith('https://')) return relativeUrlPath;
  if (!String(relativeUrlPath).startsWith('/')) return `${base}/${relativeUrlPath}`;
  return `${base}${relativeUrlPath}`;
}
const storage = multer.diskStorage({
  // Cria automaticamente diretórios com base em bucket e subpastas opcionais (ex.: userId)
  destination: (req, file, cb) => {
    const bucket = safePathPart(req.body.bucket || req.query.bucket || 'misc');
    const rawFileName = safePathPart(req.body.fileName || req.query.fileName || '');
    const nestedDir = rawFileName ? path.posix.dirname(rawFileName) : '';
    const nestedParts = nestedDir && nestedDir !== '.' ? nestedDir.split('/').filter(Boolean) : [];
    const dest = path.join(__dirname, '..', 'uploads', bucket, ...nestedParts);
    ensureDir(dest);
    cb(null, dest);
  },
  // Nome de arquivo seguro com aleatoriedade e preservação de extensão
  filename: (req, file, cb) => {
    const original = String(file.originalname || 'file');
    const ext = path.extname(original).slice(0, 10) || '';
    const name = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// Router principal
const apiRouter = express.Router();

// ------------ Autenticação (JWT/Sessão por middlewares existentes) ------------
// Mantém compatibilidade via authRequired e requireRole(['Produtor','Artista','Compositor'])

// ------------ Perfis ------------
// GET /profiles/:id — perfil público por ID
apiRouter.get('/profiles/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return bad(res, 400, 'ID inválido');
  const { rows } = await timedQuery(
    req,
    `select id, cargo, nome, nome_completo_razao_social, avatar_url, celular, bio, site_url, youtube_url, spotify_url, deezer_url, tiktok_url, genero_musical, tema, cep, logradouro, complemento, bairro, cidade, estado, plano, created_at, updated_at
       from profiles
      where id = $1
      limit 1`,
    [id],
    'profiles.get'
  );
  if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
  return ok(res, rows[0]);
}));

// PUT /admin/profiles/:id — editar perfil (verifica email duplicado)
apiRouter.put('/admin/profiles/:id', authRequired, requireRole(['Produtor']), asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return bad(res, 400, 'ID inválido');
  const payload = req.body || {};
  const email = payload.email != null ? String(payload.email).trim().toLowerCase() : null;
  if (email) {
    const dup = await timedQuery(req, 'select 1 from profiles where lower(email) = $1 and id <> $2 limit 1', [email, id], 'profiles.email_dup');
    if (dup.rows[0]) return bad(res, 409, 'Email já em uso');
  }
  const { rows } = await timedQuery(
    req,
    `update profiles
        set email = coalesce($2, email),
            nome = coalesce($3, nome),
            nome_completo_razao_social = coalesce($4, nome_completo_razao_social),
            avatar_url = coalesce($5, avatar_url),
            celular = coalesce($6, celular),
            bio = coalesce($7, bio),
            updated_at = now()
      where id = $1
      returning id, email, cargo, nome, nome_completo_razao_social, avatar_url, celular, bio, updated_at`,
    [id, email, payload.nome, payload.nome_completo_razao_social, payload.avatar_url, payload.celular, payload.bio],
    'profiles.update_admin'
  );
  if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
  return ok(res, rows[0]);
}));

// GET /profiles — listar por cargo (Artista, Produtor, Compositor, Vendedor)
apiRouter.get('/profiles', asyncHandler(async (req, res) => {
  const cargo = String(req.query.role || req.query.cargo || '').trim();
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  if (!cargo) return bad(res, 400, 'Cargo é obrigatório');
  const { rows } = await timedQuery(
    req,
    `select id, cargo, nome, nome_completo_razao_social, avatar_url, created_at
       from profiles
      where cargo = $1
      order by created_at asc
      limit $2 offset $3`,
    [cargo, limit, offset],
    'profiles.list_by_role'
  );
  return ok(res, rows);
}));

// ------------ Posts ------------
// GET /profiles/:id/posts — lista posts de um usuário
apiRouter.get('/profiles/:id/posts', asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return bad(res, 400, 'ID inválido');
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 500 });
  const { rows } = await timedQuery(
    req,
    `select id, user_id, media_url, media_type, caption, link_url, created_at
       from posts
      where user_id = $1
      order by created_at desc
      limit $2 offset $3`,
    [id, limit, offset],
    'posts.by_user'
  );
  return ok(res, rows);
}));

// POST /posts — cria post (validação de campos, media_type image|video)
apiRouter.post('/posts', authRequired, asyncHandler(async (req, res) => {
  const userId = String(req.body.user_id || req.user.id || '');
  const mediaUrl = String(req.body.media_url || '').trim();
  const mediaType = String(req.body.media_type || 'image').trim().toLowerCase();
  const caption = req.body.caption == null ? null : String(req.body.caption);
  const linkUrl = req.body.link_url == null ? null : String(req.body.link_url);
  if (!userId || !mediaUrl) return bad(res, 400, 'Dados inválidos');
  if (!['image', 'video'].includes(mediaType)) return bad(res, 400, 'Tipo de mídia inválido');
  const { rows } = await timedQuery(
    req,
    'insert into posts (user_id, media_url, media_type, caption, link_url) values ($1,$2,$3,$4,$5) returning *',
    [userId, mediaUrl, mediaType, caption, linkUrl],
    'posts.create'
  );
  return ok(res, rows[0]);
}));

// DELETE /posts/:id — só admin (Produtor) ou dono do post
apiRouter.delete('/posts/:id', authRequired, asyncHandler(async (req, res) => {
  const id = String(req.params.id || '');
  const userId = String(req.user.id);
  const isAdmin = String(req.profile && req.profile.cargo ? req.profile.cargo : '').toLowerCase() === 'produtor';
  const result = isAdmin
    ? await timedQuery(req, 'delete from posts where id = $1 returning id', [id], 'posts.delete.admin')
    : await timedQuery(req, 'delete from posts where id = $1 and user_id = $2 returning id', [id, userId], 'posts.delete.user');
  if (!result.rows[0]) return bad(res, 404, 'Post não encontrado');
  return ok(res, { ok: true });
}));

// ------------ Compositions ------------
// GET /compositions — lista pública com filtro por status
apiRouter.get('/compositions', asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
  const status = req.query.status == null ? null : String(req.query.status).trim();
  const baseSql = `
    select c.id, c.composer_id, c.title, c.status, c.file_url, c.created_at,
           coalesce(nullif(p.nome, ''), nullif(p.nome_completo_razao_social, '')) as composer_name,
           p.celular as composer_phone,
           p.avatar_url as composer_avatar_url
      from compositions c
      join profiles p on p.id = c.composer_id
    ${status ? 'where c.status = $3' : ''}
     order by c.created_at desc
     limit $1 offset $2
  `;
  const args = status ? [limit, offset, status] : [limit, offset];
  const { rows } = await timedQuery(req, baseSql, args, 'compositions.list');
  return ok(res, rows);
}));

// GET /composer/compositions — compat: público sem token, autenticado lista do próprio usuário
apiRouter.get('/composer/compositions', asyncHandler(async (req, res, next) => {
  const hasAuth = !!(req.headers.authorization || req.headers.Authorization);
  if (hasAuth) return next();
  const { limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
  const status = req.query.status == null ? null : String(req.query.status).trim();
  const baseSql = `
    select c.id, c.composer_id, c.title, c.status, c.file_url, c.created_at,
           coalesce(nullif(p.nome, ''), nullif(p.nome_completo_razao_social, '')) as composer_name,
           p.celular as composer_phone,
           p.avatar_url as composer_avatar_url
      from compositions c
      join profiles p on p.id = c.composer_id
    ${status ? 'where c.status = $3' : ''}
     order by c.created_at desc
     limit $1 offset $2
  `;
  const args = status ? [limit, offset, status] : [limit, offset];
  const { rows } = await timedQuery(req, baseSql, args, 'compositions.list.public');
  return ok(res, rows);
}));

// Versão autenticada: retorna composições do usuário autenticado
apiRouter.get('/composer/compositions', authRequired, requireRole(['Compositor','Produtor']), asyncHandler(async (req, res) => {
  const userId = String(req.user.id);
  const { limit, offset } = parsePagination(req, { defaultLimit: 500, maxLimit: 2000 });
  const { rows } = await timedQuery(
    req,
    `select id, composer_id, title, status, file_url, admin_feedback, created_at
       from compositions
      where composer_id = $1
      order by created_at desc
      limit $2 offset $3`,
    [userId, limit, offset],
    'compositions.list.mine'
  );
  return ok(res, rows);
}));

// PUT /admin/compositions/:id/status — atualizar status e feedback
apiRouter.put('/admin/compositions/:id/status', authRequired, requireRole(['Produtor']), asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return bad(res, 400, 'ID inválido');
  const status = String(req.body.status || '').trim().toLowerCase();
  const feedback = req.body.feedback == null ? null : String(req.body.feedback);
  if (!['pending', 'approved', 'rejected'].includes(status)) return bad(res, 400, 'Status inválido');
  const { rows } = await timedQuery(
    req,
    `update compositions
        set status = $2,
            admin_feedback = coalesce($3, admin_feedback),
            updated_at = now()
      where id = $1
      returning id, composer_id, title, status, admin_feedback, updated_at`,
    [id, status, feedback],
    'compositions.update_status'
  );
  if (!rows[0]) return bad(res, 404, 'Composição não encontrada');
  return ok(res, rows[0]);
}));

// GET /admin/compositions — lista administrativa com perfil do compositor
apiRouter.get('/admin/compositions', authRequired, requireRole(['Produtor']), asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 500 });
  const { rows } = await timedQuery(
    req,
    `select c.id, c.composer_id, c.title, c.status, c.file_url, c.created_at,
            p.nome as composer_name, p.avatar_url as composer_avatar_url
       from compositions c
       join profiles p on p.id = c.composer_id
      order by c.created_at desc
      limit $1 offset $2`,
    [limit, offset],
    'compositions.admin_list'
  );
  return ok(res, rows);
}));

// ------------ Projects / Producer Projects ------------
// GET /projects — publicados
apiRouter.get('/projects', asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
  const { rows } = await timedQuery(
    req,
    `select pr.id, pr.producer_id, pr.title, pr.url, pr.platform, pr.published, pr.created_at,
            pf.nome as producer_name, pf.avatar_url as producer_avatar_url
       from producer_projects pr
       left join profiles pf on pf.id = pr.producer_id
      where pr.published = true
      order by pr.created_at desc
      limit $1 offset $2`,
    [limit, offset],
    'projects.list'
  );
  return ok(res, rows);
}));

// GET /producer-projects — admin
apiRouter.get('/producer-projects', authRequired, requireRole(['Produtor']), asyncHandler(async (req, res) => {
  const { rows } = await timedQuery(
    req,
    'select id, producer_id, title, url, platform, published, created_at from producer_projects order by created_at desc',
    [],
    'producer_projects.list'
  );
  return ok(res, rows);
}));

// POST /producer-projects — criar
apiRouter.post('/producer-projects', authRequired, requireRole(['Produtor']), asyncHandler(async (req, res) => {
  const producerId = String(req.body?.producer_id || req.user?.id || '');
  const title = String(req.body?.title || '').trim();
  const url = String(req.body?.url || '').trim();
  const platform = String(req.body?.platform || '').trim();
  const published = req.body?.published == null ? true : !!req.body.published;
  if (!producerId || !title || !url || !platform) return bad(res, 400, 'Dados inválidos');
  const { rows } = await timedQuery(
    req,
    `insert into producer_projects (id, producer_id, title, url, platform, published)
     values (gen_random_uuid(), $1, $2, $3, $4, $5)
     returning id, producer_id, title, url, platform, published, created_at`,
    [producerId, title, url, platform, published],
    'producer_projects.create'
  );
  return ok(res, rows[0]);
}));

// DELETE /producer-projects/:id — remover
apiRouter.delete('/producer-projects/:id', authRequired, requireRole(['Produtor']), asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return bad(res, 400, 'ID inválido');
  const { rows } = await timedQuery(req, 'delete from producer_projects where id = $1 returning id', [id], 'producer_projects.delete');
  if (!rows[0]) return bad(res, 404, 'Projeto não encontrado');
  return ok(res, { ok: true });
}));

// ------------ Releases ------------
// GET /releases — público, paginado
apiRouter.get('/releases', withPublicCache(60000, asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
  const { rows } = await timedQuery(
    req,
    'select id, title, cover_url, created_at from releases order by created_at desc limit $1 offset $2',
    [limit, offset],
    'releases.list'
  );
  return ok(res, rows);
})));

// ------------ Sponsorship ------------
// GET /sponsors — ativos, públicos
apiRouter.get('/sponsors', withPublicCache(60000, asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const { rows } = await timedQuery(
    req,
    `select id, name, image_url, link_url, created_at
       from sponsors
      where active = true
      order by created_at desc
      limit $1 offset $2`,
    [limit, offset],
    'sponsors.list'
  );
  return ok(res, rows);
})));

// ------------ Notifications ------------
// GET /notifications — do usuário
apiRouter.get('/notifications', authRequired, asyncHandler(async (req, res) => {
  const userId = String(req.user.id);
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const { rows } = await timedQuery(
    req,
    `select id, user_id, type, payload, read, created_at
       from notifications
      where user_id = $1
      order by created_at desc
      limit $2 offset $3`,
    [userId, limit, offset],
    'notifications.list'
  );
  return ok(res, rows);
}));

// POST /notifications — criar
apiRouter.post('/notifications', authRequired, asyncHandler(async (req, res) => {
  const userId = String(req.body.user_id || req.user.id);
  const type = String(req.body.type || '').trim();
  const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
  if (!userId || !type) return bad(res, 400, 'Dados inválidos');
  const { rows } = await timedQuery(
    req,
    'insert into notifications (user_id, type, payload) values ($1,$2,$3) returning *',
    [userId, type, payload],
    'notifications.create'
  );
  emit('notification', { user_id: userId, type });
  return ok(res, rows[0]);
}));

// POST /notifications/:id/read — marcar como lida
apiRouter.post('/notifications/:id/read', authRequired, asyncHandler(async (req, res) => {
  const userId = String(req.user.id);
  const id = String(req.params.id || '').trim();
  if (!id) return bad(res, 400, 'ID inválido');
  const { rows } = await timedQuery(
    req,
    'update notifications set read = true, updated_at = now() where id = $1 and user_id = $2 returning id, read, updated_at',
    [id, userId],
    'notifications.read_one'
  );
  if (!rows[0]) return bad(res, 404, 'Notificação não encontrada');
  return ok(res, rows[0]);
}));

// POST /notifications/read-all — marcar todas como lidas
apiRouter.post('/notifications/read-all', authRequired, asyncHandler(async (req, res) => {
  const userId = String(req.user.id);
  await timedQuery(req, 'update notifications set read = true, updated_at = now() where user_id = $1', [userId], 'notifications.read_all');
  return ok(res, { ok: true });
}));

// ------------ Chats / Messages ------------
// GET /chats — lista chats do usuário (inclui mensagens e participantes)
apiRouter.get('/chats', authRequired, asyncHandler(async (req, res) => {
  const userId = String(req.user.id);
  const { rows: chats } = await timedQuery(
    req,
    'select id, participant_ids, status, assigned_to, owner_id, metadata, created_at from chats where $1 = any(participant_ids) order by updated_at desc nulls last, created_at desc',
    [userId],
    'chats.list_by_user'
  );
  const ids = (chats || []).map((c) => c.id);
  const { rows: messages } = ids.length
    ? await timedQuery(
        req,
        'select id, chat_id, author_id, content, created_at from messages where chat_id = any($1::uuid[]) order by created_at asc',
        [ids],
        'messages.by_chat_ids'
      )
    : { rows: [] };
  return ok(res, { chats, messages });
}));

// POST /chats — criar chat (máx 10 participantes)
apiRouter.post('/chats', authRequired, asyncHandler(async (req, res) => {
  const ownerId = String(req.user.id);
  const participants = Array.isArray(req.body.participant_ids) ? req.body.participant_ids.map(String).filter(Boolean) : [];
  const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
  const uniq = Array.from(new Set([ownerId, ...participants]));
  if (uniq.length > 10) return bad(res, 400, 'Máximo 10 participantes');
  const { rows } = await timedQuery(
    req,
    'insert into chats (participant_ids, owner_id, metadata) values ($1,$2,$3) returning id, participant_ids, status, assigned_to, owner_id, metadata, created_at',
    [uniq, ownerId, metadata],
    'chats.create'
  );
  const chat = rows[0];
  emit('chat_update', { chat_id: chat.id });
  return ok(res, chat);
}));

// PUT /chats/:id/status — alterar status
apiRouter.put('/chats/:id/status', authRequired, asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  const status = String(req.body.status || '').trim();
  if (!id || !status) return bad(res, 400, 'Dados inválidos');
  const { rows } = await timedQuery(
    req,
    'update chats set status = $2, updated_at = now() where id = $1 returning id, status, updated_at',
    [id, status],
    'chats.update_status'
  );
  if (!rows[0]) return bad(res, 404, 'Chat não encontrado');
  emit('chat_update', { chat_id: id });
  return ok(res, rows[0]);
}));

// PUT /chats/:id/assign — atribuir chat
apiRouter.put('/chats/:id/assign', authRequired, asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  const assignedTo = req.body.assigned_to == null ? null : String(req.body.assigned_to);
  if (!id) return bad(res, 400, 'ID inválido');
  const { rows } = await timedQuery(
    req,
    'update chats set assigned_to = $2, updated_at = now() where id = $1 returning id, assigned_to, updated_at',
    [id, assignedTo],
    'chats.assign'
  );
  if (!rows[0]) return bad(res, 404, 'Chat não encontrado');
  emit('chat_update', { chat_id: id });
  return ok(res, rows[0]);
}));

// POST /messages — enviar mensagem
apiRouter.post('/messages', authRequired, asyncHandler(async (req, res) => {
  const chatId = String(req.body.chat_id || '').trim();
  const authorId = String(req.user.id);
  const content = String(req.body.content || '').trim();
  if (!chatId || !content) return bad(res, 400, 'Dados inválidos');
  const { rows } = await timedQuery(
    req,
    'insert into messages (chat_id, author_id, content) values ($1,$2,$3) returning id, chat_id, author_id, content, created_at',
    [chatId, authorId, content],
    'messages.create'
  );
  const msg = rows[0];
  emit('message', { chat_id: chatId, message_id: msg.id });
  return ok(res, msg);
}));

// SSE /chat/stream — eventos em tempo real com ping a cada 25s
apiRouter.get('/chat/stream', authRequired, (req, res) => {
  registerClient(req, res);
  const ping = setInterval(() => {
    try { sseWrite(res, 'ping', { t: Date.now() }); } catch { /* ignore */ }
  }, 25000);
  res.on('close', () => clearInterval(ping));
});

// ------------ Events ------------
// GET /events — público, paginado, opcional por artista
apiRouter.get('/events', withPublicCache(60000, asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const artistId = req.query.artistId != null ? String(req.query.artistId) : (req.query.artist_id != null ? String(req.query.artist_id) : null);
  const args = [];
  let where = 'where e.event_date >= now()';
  if (artistId) {
    args.push(artistId);
    where += ` and e.artist_id = $${args.length}`;
  }
  args.push(limit);
  args.push(offset);
  const { rows } = await timedQuery(
    req,
    `select e.id, e.artist_id, e.event_date, e.location, e.flyer_url, e.ticket_price_cents, e.purchase_contact, e.created_at,
            p.nome as artist_name, p.nome_completo_razao_social as artist_legal_name, p.avatar_url as artist_avatar_url
       from public_events e
       join profiles p on p.id = e.artist_id
      ${where}
      order by e.event_date asc
      limit $${args.length - 1} offset $${args.length}`,
    args,
    'events.public_list'
  );
  return ok(res, rows);
})));

// Compat: GET /seller/artist-events?artist_id=... — usado por frontend do vendedor
apiRouter.get('/seller/artist-events', authRequired, requireRole(['Vendedor','Produtor']), asyncHandler(async (req, res) => {
  const artistId = String(req.query.artist_id || '').trim();
  if (!artistId) return bad(res, 400, 'artist_id é obrigatório');
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const { rows } = await timedQuery(
    req,
    `select id, artist_id, event_date, location, flyer_url, ticket_price_cents, purchase_contact, created_at
       from public_events
      where artist_id = $1
        and event_date >= now()
      order by event_date asc
      limit $2 offset $3`,
    [artistId, limit, offset],
    'events.seller_by_artist'
  );
  return ok(res, rows);
}));

// GET /profiles/:id/events — eventos públicos de um artista
apiRouter.get('/profiles/:id/events', withPublicCache(60000, asyncHandler(async (req, res) => {
  const artistId = String(req.params.id || '').trim();
  if (!artistId) return bad(res, 400, 'ID inválido');
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const { rows } = await timedQuery(
    req,
    `select e.id, e.artist_id, e.event_date, e.location, e.flyer_url, e.ticket_price_cents, e.purchase_contact, e.created_at
       from public_events e
      where e.artist_id = $1
        and e.event_date >= now()
      order by e.event_date asc
      limit $2 offset $3`,
    [artistId, limit, offset],
    'events.public_by_artist'
  );
  return ok(res, rows);
})));

// GET /my/events — eventos do artista logado
apiRouter.get('/my/events', authRequired, asyncHandler(async (req, res) => {
  const artistId = String(req.user.id);
  const { limit, offset } = parsePagination(req, { defaultLimit: 200, maxLimit: 2000 });
  const { rows } = await timedQuery(
    req,
    `select id, artist_id, event_date, location, flyer_url, ticket_price_cents, purchase_contact, created_at
       from public_events
      where artist_id = $1
      order by event_date asc
      limit $2 offset $3`,
    [artistId, limit, offset],
    'events.mine'
  );
  return ok(res, rows);
}));

// POST /events — criar evento (valida data/local/preço/flyer)
apiRouter.post('/events', authRequired, asyncHandler(async (req, res) => {
  const artistId = String(req.body.artist_id || req.user.id || '');
  const location = String(req.body.location || '').trim();
  const flyerUrl = req.body.flyer_url == null ? null : String(req.body.flyer_url).trim();
  const ticketPriceCents = req.body.ticket_price_cents == null ? null : Number(req.body.ticket_price_cents);
  const purchaseContact = req.body.purchase_contact == null ? null : String(req.body.purchase_contact).trim();
  const dateRaw = req.body.event_date != null ? String(req.body.event_date) : null;
  const eventDate = dateRaw ? new Date(dateRaw) : null;
  if (!artistId || !location || !eventDate) return bad(res, 400, 'Dados inválidos');
  if (Number.isNaN(eventDate.getTime())) return bad(res, 400, 'Data inválida');
  const finalPrice = ticketPriceCents == null || Number.isNaN(ticketPriceCents) ? null : ticketPriceCents;
  const { rows } = await timedQuery(
    req,
    `insert into public_events (artist_id, event_date, location, flyer_url, ticket_price_cents, purchase_contact)
     values ($1,$2,$3,$4,$5,$6)
     returning id, artist_id, event_date, location, flyer_url, ticket_price_cents, purchase_contact, created_at`,
    [artistId, eventDate.toISOString(), location, flyerUrl, finalPrice, purchaseContact],
    'events.create'
  );
  return ok(res, rows[0]);
}));

// DELETE /events/:id — dono ou admin
apiRouter.delete('/events/:id', authRequired, asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  const userId = String(req.user.id);
  const isAdmin = String(req.profile && req.profile.cargo ? req.profile.cargo : '').toLowerCase() === 'produtor';
  if (!id) return bad(res, 400, 'ID inválido');
  const result = isAdmin
    ? await timedQuery(req, 'delete from public_events where id = $1 returning id', [id], 'events.delete.admin')
    : await timedQuery(req, 'delete from public_events where id = $1 and artist_id = $2 returning id', [id, userId], 'events.delete.user');
  if (!result.rows[0]) return bad(res, 404, 'Evento não encontrado');
  return ok(res, { ok: true });
}));

// ------------ Upload ------------
// POST /upload — single file, com bucket
apiRouter.post('/upload', authRequired, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file || !req.file.filename) return bad(res, 400, 'Arquivo não enviado');
  const bucket = safePathPart(req.body.bucket || req.query.bucket || 'misc');
  const rawFileName = safePathPart(req.body.fileName || req.query.fileName || '');
  const nestedDir = rawFileName ? path.posix.dirname(rawFileName) : '';
  const nestedPath = nestedDir && nestedDir !== '.' ? `/${nestedDir}` : '';
  const relative = `/uploads/${bucket}${nestedPath}/${safePathPart(req.file.filename)}`;
  return ok(res, { url: absoluteUploadsUrl(req, relative) });
}));

// POST /upload/single — igual ao /upload
apiRouter.post('/upload/single', authRequired, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file || !req.file.filename) return bad(res, 400, 'Arquivo não enviado');
  const bucket = safePathPart(req.body.bucket || req.query.bucket || 'misc');
  const relative = `/uploads/${bucket}/${safePathPart(req.file.filename)}`;
  return ok(res, { url: absoluteUploadsUrl(req, relative) });
}));

// POST /upload/multiple — até 10 arquivos
apiRouter.post('/upload/multiple', authRequired, upload.array('files', 10), asyncHandler(async (req, res) => {
  const bucket = safePathPart(req.body.bucket || req.query.bucket || 'misc');
  const urls = (req.files || []).map((f) => absoluteUploadsUrl(req, `/uploads/${bucket}/${safePathPart(f.filename)}`));
  return ok(res, { urls });
}));

// ------------ Home Aggregate ------------
// GET /home — agrega releases, projects, compositions, composers, sponsors, artists, producers, sellers
apiRouter.get('/home', withPublicCache(60000, asyncHandler(async (req, res) => {
  const releasesLimit = clampInt(req.query.releasesLimit, { min: 1, max: 50, fallback: 20 });
  const projectsLimit = clampInt(req.query.projectsLimit, { min: 1, max: 50, fallback: 20 });
  const compositionsLimit = clampInt(req.query.compositionsLimit, { min: 1, max: 50, fallback: 20 });
  const sponsorsLimit = clampInt(req.query.sponsorsLimit, { min: 1, max: 100, fallback: 50 });
  const profilesLimit = clampInt(req.query.profilesLimit, { min: 1, max: 200, fallback: 60 });
  const sql = `
    select
      (select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb)
         from (select id, title, cover_url, created_at
                 from releases
                order by created_at desc
                limit $1) r) as releases,
      (select coalesce(jsonb_agg(p order by p.created_at desc), '[]'::jsonb)
         from (select pr.id, pr.producer_id, pr.title, pr.url, pr.platform, pr.created_at,
                      pf.nome as producer_name, pf.avatar_url as producer_avatar_url
                 from producer_projects pr
                 left join profiles pf on pf.id = pr.producer_id
                where pr.published = true
                order by pr.created_at desc
                limit $2) p) as projects,
      (select coalesce(jsonb_agg(c order by c.created_at desc), '[]'::jsonb)
         from (select c.id, c.composer_id, c.title, c.status, c.file_url, c.created_at,
                      coalesce(nullif(p.nome, ''), nullif(p.nome_completo_razao_social, '')) as composer_name,
                      p.celular as composer_phone,
                      p.avatar_url as composer_avatar_url
                 from compositions c
                 join profiles p on p.id = c.composer_id
                order by c.created_at desc
                limit $3) c) as compositions,
      (select coalesce(jsonb_agg(s order by s.created_at desc), '[]'::jsonb)
         from (select id, name, image_url, link_url, created_at
                 from sponsors
                where active = true
                order by created_at desc
                limit $4) s) as sponsors,
      (select coalesce(jsonb_agg(x order by x.created_at asc), '[]'::jsonb)
         from (select id, nome, nome_completo_razao_social, avatar_url, created_at
                 from profiles
                where cargo = 'Compositor'
                order by created_at asc
                limit $5) x) as composers,
      (select coalesce(jsonb_agg(x order by x.created_at asc), '[]'::jsonb)
         from (select id, nome, nome_completo_razao_social, avatar_url, created_at
                 from profiles
                where cargo = 'Artista'
                order by created_at asc
                limit $5) x) as artists,
      (select coalesce(jsonb_agg(x order by x.created_at asc), '[]'::jsonb)
         from (select id, nome, nome_completo_razao_social, avatar_url, created_at
                 from profiles
                where cargo = 'Produtor'
                order by created_at asc
                limit $5) x) as producers,
      (select coalesce(jsonb_agg(x order by x.created_at asc), '[]'::jsonb)
         from (select id, nome, nome_completo_razao_social, avatar_url, created_at
                 from profiles
                where cargo = 'Vendedor'
                order by created_at asc
                limit $5) x) as sellers
  `;
  const { rows } = await timedQuery(
    req,
    sql,
    [releasesLimit, projectsLimit, compositionsLimit, sponsorsLimit, profilesLimit],
    'home.aggregate'
  );
  const row = rows[0] || {};
  return ok(res, {
    releases: row.releases || [],
    compositions: row.compositions || [],
    projects: row.projects || [],
    composers: row.composers || [],
    sponsors: row.sponsors || [],
    artists: row.artists || [],
    producers: row.producers || [],
    sellers: row.sellers || []
  });
})));

// ------------ Admin / Purge ------------
// POST /admin/users/:id/purge — remove posts, mensagens, chats, fila e perfil
apiRouter.post('/admin/users/:id/purge', authRequired, requireRole(['Produtor']), asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return bad(res, 400, 'ID inválido');
  await timedQuery(req, 'delete from messages where author_id = $1', [id], 'purge.messages');
  await timedQuery(req, 'delete from chats where owner_id = $1 or $1 = any(participant_ids)', [id], 'purge.chats');
  await timedQuery(req, 'delete from posts where user_id = $1', [id], 'purge.posts');
  await timedQuery(req, 'delete from support_queue where requester_id = $1', [id], 'purge.queue');
  await timedQuery(req, 'delete from notifications where user_id = $1', [id], 'purge.notifications');
  await timedQuery(req, 'delete from profiles where id = $1', [id], 'purge.profile');
  return ok(res, { ok: true });
}));

// ------------ Users Compat ------------
// GET /users/:id/quota — compat com clientes antigos
apiRouter.get('/users/:id/quota', authRequired, asyncHandler(async (req, res) => {
  const targetId = String(req.params.id || '').trim();
  if (!targetId) return bad(res, 400, 'ID inválido');
  const requesterId = String(req.user.id);
  const isProducer = String(req.profile && req.profile.cargo ? req.profile.cargo : '').toLowerCase() === 'produtor';
  if (!isProducer && targetId !== requesterId) return bad(res, 403, 'Sem permissão');
  const { rows } = await timedQuery(
    req,
    'select id, plano, bonus_quota, plan_started_at from profiles where id = $1 limit 1',
    [targetId],
    'users.quota'
  );
  const row = rows[0] || null;
  if (!row) return bad(res, 404, 'Usuário não encontrado');
  return ok(res, {
    id: row.id,
    plano: row.plano || 'Avulso',
    bonus_quota: Number(row.bonus_quota || 0),
    plan_started_at: row.plan_started_at || null
  });
}));

module.exports = { apiRouter };

