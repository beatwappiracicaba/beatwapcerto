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

function okPerf(req, res, data) {
  if (req && String(req.query.perf || '') === '1' && req._perf) {
    const totalMs = nowMs() - req._perf.startMs;
    const dbMs = req._perf.queries.reduce((acc, q) => acc + (q.ms || 0), 0);
    return res.json({ success: true, data, perf: { totalMs, dbMs, queries: req._perf.queries } });
  }
  return ok(res, data);
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

function parseMoneyToCents(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value * 100));
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, '').replace(/[^\d.,-]/g, '');
  if (!normalized) return null;
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : '.';
  let numStr = normalized;
  if (decimalSep === ',') {
    numStr = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    numStr = normalized.replace(/,/g, '');
  }
  const n = Number.parseFloat(numStr);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100));
}

function normalizePurchaseContact(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) return `https://wa.me/55${digits}`;
  return raw;
}

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || '');
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return { mime: String(match[1] || '').toLowerCase(), base64: String(match[2] || '') };
}

const uploadsCountCache = {
  checkedAtMs: 0,
  musicTable: null,
  tableUserColumn: new Map(),
  tableColumns: new Map()
};

async function resolveMusicTable() {
  if (uploadsCountCache.musicTable && (Date.now() - uploadsCountCache.checkedAtMs) < 5 * 60 * 1000) return uploadsCountCache.musicTable;
  uploadsCountCache.checkedAtMs = Date.now();
  const { rows } = await query(
    "select to_regclass('public.musics') as musics, to_regclass('public.songs') as songs, to_regclass('public.music') as music",
    []
  );
  const row = rows[0] || {};
  uploadsCountCache.musicTable = row.musics || row.songs || row.music || null;
  return uploadsCountCache.musicTable;
}

function parseQualifiedTableName(qualified) {
  const raw = String(qualified || '').trim();
  if (!raw) return { schema: 'public', table: '' };
  const cleaned = raw.replace(/"/g, '');
  const parts = cleaned.split('.');
  if (parts.length === 2) return { schema: parts[0] || 'public', table: parts[1] || '' };
  return { schema: 'public', table: cleaned };
}

async function getTableColumns(qualifiedTable) {
  const key = String(qualifiedTable || '').trim();
  if (!key) return new Set();
  const cached = uploadsCountCache.tableColumns.get(key);
  if (cached) return cached;
  const { schema, table } = parseQualifiedTableName(key);
  if (!table) return new Set();
  const { rows } = await query(
    'select column_name from information_schema.columns where table_schema = $1 and table_name = $2',
    [schema, table]
  );
  const set = new Set((rows || []).map((r) => String(r.column_name)));
  uploadsCountCache.tableColumns.set(key, set);
  return set;
}

function pickFirstExistingColumn(columnsSet, candidates) {
  for (const c of candidates) {
    if (columnsSet.has(c)) return c;
  }
  return null;
}

function qIdent(col) {
  return `"${String(col).replace(/"/g, '""')}"`;
}

async function countByUserAndCreatedAt({ table, userId, startIso, endIso }) {
  const safeTable = String(table || '').trim();
  if (!safeTable) return 0;
  const userColumns = ['artist_id', 'artista_id', 'user_id', 'owner_id', 'composer_id', 'producer_id'];

  const cachedCol = uploadsCountCache.tableUserColumn.get(safeTable) || null;
  const candidates = cachedCol ? [cachedCol, ...userColumns.filter((c) => c !== cachedCol)] : userColumns;

  for (const col of candidates) {
    const safeCol = userColumns.includes(col) ? col : null;
    if (!safeCol) continue;
    try {
      if (startIso && endIso) {
        const { rows } = await query(
          `select count(*)::int as count from ${safeTable} where ${safeCol} = $1 and created_at >= $2 and created_at <= $3`,
          [userId, startIso, endIso]
        );
        uploadsCountCache.tableUserColumn.set(safeTable, safeCol);
        return Number(rows[0]?.count || 0);
      }
      if (startIso) {
        const { rows } = await query(
          `select count(*)::int as count from ${safeTable} where ${safeCol} = $1 and created_at >= $2`,
          [userId, startIso]
        );
        uploadsCountCache.tableUserColumn.set(safeTable, safeCol);
        return Number(rows[0]?.count || 0);
      }
      if (endIso) {
        const { rows } = await query(
          `select count(*)::int as count from ${safeTable} where ${safeCol} = $1 and created_at <= $2`,
          [userId, endIso]
        );
        uploadsCountCache.tableUserColumn.set(safeTable, safeCol);
        return Number(rows[0]?.count || 0);
      }
      const { rows } = await query(`select count(*)::int as count from ${safeTable} where ${safeCol} = $1`, [userId]);
      uploadsCountCache.tableUserColumn.set(safeTable, safeCol);
      return Number(rows[0]?.count || 0);
    } catch {
      try {
        const { rows } = await query(`select count(*)::int as count from ${safeTable} where ${safeCol} = $1`, [userId]);
        uploadsCountCache.tableUserColumn.set(safeTable, safeCol);
        return Number(rows[0]?.count || 0);
      } catch {
        void 0;
      }
    }
  }

  return 0;
}

function cargoFromRole(roleRaw) {
  const role = String(roleRaw || '').trim().toLowerCase();
  if (!role) return null;
  if (role === 'artist' || role === 'artista') return 'Artista';
  if (role === 'seller' || role === 'vendedor') return 'Vendedor';
  if (role === 'producer' || role === 'produtor' || role === 'admin') return 'Produtor';
  if (role === 'composer' || role === 'compositor') return 'Compositor';
  return null;
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

async function timedQuery(req, sql, params, label) {
  const start = nowMs();
  const result = await query(sql, params);
  const ms = nowMs() - start;
  if (req && req._perf) {
    req._perf.queries.push({
      label: label || null,
      ms,
      rowCount: typeof result.rowCount === 'number' ? result.rowCount : null,
    });
  }
  return result;
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

apiRouter.use((req, res, next) => {
  req._perf = { startMs: nowMs(), queries: [] };
  res.on('finish', () => {
    const totalMs = nowMs() - req._perf.startMs;
    const qMs = req._perf.queries.reduce((acc, q) => acc + (q.ms || 0), 0);
    if (totalMs >= 500 || String(req.query.perf || '') === '1') {
      process.stdout.write(
        `${req.method} ${req.originalUrl} total=${totalMs}ms db=${qMs}ms q=${req._perf.queries.length}\n`
      );
    }
  });
  next();
});

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

apiRouter.post(
  '/auth/change-password',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = String(req.user.id);
    const newPassword = String(req.body?.new_password || '');
    if (!newPassword || newPassword.length < 6) return bad(res, 400, 'Senha muito curta');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('update profiles set password_hash = $2, updated_at = now() where id = $1', [userId, passwordHash]);
    return ok(res, { ok: true });
  })
);

apiRouter.get(
  '/profile',
  authRequired,
  asyncHandler(async (req, res) => {
    return ok(res, req.profile);
  })
);

apiRouter.put(
  '/profile',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = String(req.user.id);
    const payload = req.body || {};

    const email = payload.email != null ? String(payload.email).trim().toLowerCase() : null;
    if (email && !email.includes('@')) return bad(res, 400, 'Email inválido');
    if (email) {
      const { rows: existing } = await query('select id from profiles where email = $1 and id <> $2 limit 1', [email, id]);
      if (existing[0]) return bad(res, 409, 'Email já está em uso');
    }

    const { rows } = await query(
      `update profiles
          set email = coalesce($2, email),
              nome = coalesce($3, nome),
              nome_completo_razao_social = coalesce($4, nome_completo_razao_social),
              avatar_url = coalesce($5, avatar_url),
              bio = coalesce($6, bio),
              cpf_cnpj = coalesce($7, cpf_cnpj),
              celular = coalesce($8, celular),
              instagram_url = coalesce($9, instagram_url),
              site_url = coalesce($10, site_url),
              youtube_url = coalesce($11, youtube_url),
              spotify_url = coalesce($12, spotify_url),
              deezer_url = coalesce($13, deezer_url),
              tiktok_url = coalesce($14, tiktok_url),
              genero_musical = coalesce($15, genero_musical),
              tema = coalesce($16, tema),
              cep = coalesce($17, cep),
              logradouro = coalesce($18, logradouro),
              complemento = coalesce($19, complemento),
              bairro = coalesce($20, bairro),
              cidade = coalesce($21, cidade),
              estado = coalesce($22, estado),
              plano = coalesce($23, plano),
              updated_at = now()
        where id = $1
      returning id, email, cargo, nome, nome_completo_razao_social, avatar_url, bio, cpf_cnpj, celular, instagram_url, site_url, youtube_url, spotify_url, deezer_url, tiktok_url, genero_musical, tema, cep, logradouro, complemento, bairro, cidade, estado, plano, access_control, created_at, updated_at`,
      [
        id,
        email,
        payload.nome != null ? String(payload.nome) : null,
        payload.nome_completo_razao_social != null ? String(payload.nome_completo_razao_social) : null,
        payload.avatar_url != null ? String(payload.avatar_url) : null,
        payload.bio != null ? String(payload.bio) : null,
        payload.cpf_cnpj != null ? String(payload.cpf_cnpj) : null,
        payload.celular != null ? String(payload.celular) : null,
        payload.instagram_url != null ? String(payload.instagram_url) : null,
        payload.site_url != null ? String(payload.site_url) : null,
        payload.youtube_url != null ? String(payload.youtube_url) : null,
        payload.spotify_url != null ? String(payload.spotify_url) : null,
        payload.deezer_url != null ? String(payload.deezer_url) : null,
        payload.tiktok_url != null ? String(payload.tiktok_url) : null,
        payload.genero_musical != null ? String(payload.genero_musical) : null,
        payload.tema != null ? String(payload.tema) : null,
        payload.cep != null ? String(payload.cep) : null,
        payload.logradouro != null ? String(payload.logradouro) : null,
        payload.complemento != null ? String(payload.complemento) : null,
        payload.bairro != null ? String(payload.bairro) : null,
        payload.cidade != null ? String(payload.cidade) : null,
        payload.estado != null ? String(payload.estado) : null,
        payload.plano != null ? String(payload.plano) : null
      ]
    );

    return ok(res, rows[0] || null);
  })
);

apiRouter.post(
  '/profile/avatar',
  authRequired,
  asyncHandler(async (req, res) => {
    const parsed = parseDataUrl(req.body?.dataUrl);
    if (!parsed) return bad(res, 400, 'dataUrl inválido');

    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!allowed.has(parsed.mime)) return bad(res, 400, 'Formato de imagem não suportado');

    const buffer = Buffer.from(parsed.base64, 'base64');
    if (!buffer.length || buffer.length > 6 * 1024 * 1024) return bad(res, 400, 'Imagem muito grande');

    const ext = parsed.mime === 'image/jpeg' ? 'jpg' : parsed.mime === 'image/webp' ? 'webp' : 'png';
    const bucket = 'avatars';
    const dest = path.join(__dirname, '..', 'uploads', bucket);
    ensureDir(dest);
    const filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(dest, filename), buffer);
    const relative = `/uploads/${bucket}/${filename}`;
    return ok(res, { avatar_url: absoluteUploadsUrl(req, relative) });
  })
);

apiRouter.get(
  '/me/uploads/count',
  authRequired,
  asyncHandler(async (req, res) => {
    const userId = String(req.user.id);
    const type = String(req.query.type || 'music').trim().toLowerCase();
    const startRaw = req.query.start != null ? String(req.query.start) : null;
    const endRaw = req.query.end != null ? String(req.query.end) : null;
    const startDate = startRaw ? new Date(startRaw) : null;
    const endDate = endRaw ? new Date(endRaw) : null;

    if (startDate && Number.isNaN(startDate.getTime())) return bad(res, 400, 'Data inicial inválida');
    if (endDate && Number.isNaN(endDate.getTime())) return bad(res, 400, 'Data final inválida');
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) return bad(res, 400, 'Intervalo de datas inválido');

    const startIso = startDate ? startDate.toISOString() : null;
    const endIso = endDate ? endDate.toISOString() : null;

    if (type === 'composition') {
      const count = await countByUserAndCreatedAt({
        table: 'public.compositions',
        userId,
        startIso,
        endIso
      });
      return ok(res, { count });
    }

    if (type === 'post') {
      const count = await countByUserAndCreatedAt({
        table: 'public.posts',
        userId,
        startIso,
        endIso
      });
      return ok(res, { count });
    }

    if (type === 'event') {
      const count = await countByUserAndCreatedAt({
        table: 'public.public_events',
        userId,
        startIso,
        endIso
      });
      return ok(res, { count });
    }

    const musicTable = await resolveMusicTable();
    if (!musicTable) return ok(res, { count: 0 });

    const count = await countByUserAndCreatedAt({
      table: String(musicTable),
      userId,
      startIso,
      endIso
    });
    return ok(res, { count });
  })
);

apiRouter.get(
  '/profiles',
  asyncHandler(async (req, res) => {
    const includePrivate = !!(req.headers.authorization || req.headers.Authorization);
    const cargo = cargoFromRole(req.query.role);
    const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });

    const cols = includePrivate
      ? 'id, email, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control, created_at'
      : 'id, null::text as email, cargo, nome, nome_completo_razao_social, avatar_url, plano, null::jsonb as access_control, created_at';

    const sql = cargo
      ? `select ${cols} from profiles where cargo = $1 order by created_at desc limit $2 offset $3`
      : `select ${cols} from profiles order by created_at desc limit $1 offset $2`;
    const args = cargo ? [cargo, limit, offset] : [limit, offset];
    const { rows } = await timedQuery(req, sql, args, 'profiles.list');
    return okPerf(req, res, rows);
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
      `select id,
              ${includeEmail ? 'email' : 'null::text as email'},
              cargo,
              nome,
              nome_completo_razao_social,
              avatar_url,
              bio,
              celular,
              instagram_url,
              site_url,
              youtube_url,
              spotify_url,
              deezer_url,
              tiktok_url,
              genero_musical,
              tema,
              cidade,
              estado,
              plano,
              access_control,
              created_at
         from profiles
        where id = $1
        limit 1`,
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

apiRouter.get(
  '/profiles/:id/access-control',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const targetId = String(req.params.id || '');
    const { rows } = await query('select id, access_control from profiles where id = $1 limit 1', [targetId]);
    if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
    return ok(res, rows[0]);
  })
);

apiRouter.get(
  '/profiles/:id/access_control',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const targetId = String(req.params.id || '');
    const { rows } = await query('select id, access_control from profiles where id = $1 limit 1', [targetId]);
    if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
    return ok(res, rows[0]);
  })
);

apiRouter.get(
  '/profiles/:id/accesscontrol',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const targetId = String(req.params.id || '');
    const { rows } = await query('select id, access_control from profiles where id = $1 limit 1', [targetId]);
    if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
    return ok(res, rows[0]);
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

apiRouter.put(
  '/profiles/:id/access_control',
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

apiRouter.put(
  '/profiles/:id/accesscontrol',
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

apiRouter.get(
  '/admin/artist/:id/metrics',
  authRequired,
  asyncHandler(async (req, res) => {
    const artistId = String(req.params.id || '');
    const requesterId = String(req.user?.id || '');
    const requesterRole = String(req.profile?.cargo || '');
    if (requesterRole !== 'Produtor' && requesterId !== artistId) return bad(res, 403, 'Sem permissão');

    const { rows } = await query(
      'select artist_id, total_plays, ouvintes_mensais, receita_estimada, updated_at from artist_metrics where artist_id = $1 limit 1',
      [artistId]
    );
    if (rows[0]) return ok(res, rows[0]);
    return ok(res, { artist_id: artistId, total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0, updated_at: null });
  })
);

apiRouter.get(
  '/admin/stats',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const { rows: aRows } = await query("select count(*)::int as count from profiles where cargo = 'Artista'", []);
    const artists = aRows[0]?.count || 0;

    const musicTable = await resolveMusicTable();
    if (!musicTable) return ok(res, { artists, musics: 0, pending: 0 });

    const { rows: mRows } = await query(`select count(*)::int as count from ${musicTable}`, []);
    const musics = mRows[0]?.count || 0;

    const cols = await getTableColumns(musicTable);
    const statusCol = pickFirstExistingColumn(cols, ['status', 'estado']);
    if (!statusCol) return ok(res, { artists, musics, pending: 0 });

    const { rows: pRows } = await query(
      `select count(*)::int as count from ${musicTable} where lower(${qIdent(statusCol)}) = any($1::text[])`,
      [['pendente', 'pending']]
    );
    const pending = pRows[0]?.count || 0;
    return ok(res, { artists, musics, pending });
  })
);

apiRouter.post(
  '/admin/artist/:id/metrics',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const artistId = String(req.params.id || '');
    const totalPlays = clampInt(req.body?.total_plays, { min: 0, max: 1_000_000_000, fallback: 0 });
    const ouvintesMensais = clampInt(req.body?.ouvintes_mensais, { min: 0, max: 1_000_000_000, fallback: 0 });
    const receitaEstimada = Number(req.body?.receita_estimada || 0);
    const safeReceita = Number.isFinite(receitaEstimada) ? receitaEstimada : 0;

    const { rows } = await query(
      `insert into artist_metrics (artist_id, total_plays, ouvintes_mensais, receita_estimada, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (artist_id)
       do update set total_plays = excluded.total_plays,
                     ouvintes_mensais = excluded.ouvintes_mensais,
                     receita_estimada = excluded.receita_estimada,
                     updated_at = now()
       returning artist_id, total_plays, ouvintes_mensais, receita_estimada, updated_at`,
      [artistId, totalPlays, ouvintesMensais, safeReceita]
    );
    return ok(res, rows[0] || null);
  })
);

apiRouter.get(
  '/admin/artists/metrics',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const raw = req.query.ids != null ? String(req.query.ids) : '';
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const uniqueIds = Array.from(new Set(ids)).filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    if (!uniqueIds.length) return ok(res, []);

    const { rows } = await query(
      'select artist_id, total_plays, ouvintes_mensais, receita_estimada, updated_at from artist_metrics where artist_id = any($1::uuid[])',
      [uniqueIds]
    );
    const byId = new Map((rows || []).map((r) => [String(r.artist_id), r]));
    const ordered = uniqueIds.map((id) => byId.get(String(id)) || { artist_id: id, total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0, updated_at: null });
    return ok(res, ordered);
  })
);

apiRouter.get(
  '/admin/musics',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const musicTable = await resolveMusicTable();
    if (!musicTable) return ok(res, []);

    const cols = await getTableColumns(musicTable);
    const idCol = pickFirstExistingColumn(cols, ['id']);
    if (!idCol) return ok(res, []);

    const artistCol = pickFirstExistingColumn(cols, ['artista_id', 'artist_id', 'user_id', 'owner_id']);
    const titleCol = pickFirstExistingColumn(cols, ['titulo', 'title', 'nome', 'name']);
    const statusCol = pickFirstExistingColumn(cols, ['status', 'estado']);
    const createdAtCol = pickFirstExistingColumn(cols, ['created_at', 'createdAt', 'data_criacao', 'created']);

    const selectParts = [
      `m.${qIdent(idCol)} as id`,
      titleCol ? `m.${qIdent(titleCol)} as titulo` : `null::text as titulo`,
      artistCol ? `m.${qIdent(artistCol)} as artista_id` : `null::uuid as artista_id`,
      `pf.nome as nome_artista`,
      cols.has('cover_url') ? `m.${qIdent('cover_url')} as cover_url` : `null::text as cover_url`,
      cols.has('audio_url') ? `m.${qIdent('audio_url')} as audio_url` : `null::text as audio_url`,
      cols.has('authorization_url') ? `m.${qIdent('authorization_url')} as authorization_url` : `null::text as authorization_url`,
      cols.has('is_original') ? `m.${qIdent('is_original')} as is_original` : `false as is_original`,
      statusCol ? `m.${qIdent(statusCol)} as status` : `null::text as status`,
      cols.has('estilo') ? `m.${qIdent('estilo')} as estilo` : `null::text as estilo`,
      cols.has('upc') ? `m.${qIdent('upc')} as upc` : `null::text as upc`,
      cols.has('isrc') ? `m.${qIdent('isrc')} as isrc` : `null::text as isrc`,
      cols.has('presave_link') ? `m.${qIdent('presave_link')} as presave_link` : `null::text as presave_link`,
      cols.has('release_date') ? `m.${qIdent('release_date')} as release_date` : `null::timestamptz as release_date`,
      cols.has('album_id') ? `m.${qIdent('album_id')} as album_id` : `null::uuid as album_id`,
      cols.has('album_title') ? `m.${qIdent('album_title')} as album_title` : `null::text as album_title`,
      cols.has('is_beatwap_produced') ? `m.${qIdent('is_beatwap_produced')} as is_beatwap_produced` : `false as is_beatwap_produced`,
      cols.has('produced_by') ? `m.${qIdent('produced_by')} as produced_by` : `null::uuid as produced_by`,
      cols.has('show_on_home') ? `m.${qIdent('show_on_home')} as show_on_home` : `false as show_on_home`,
      createdAtCol ? `m.${qIdent(createdAtCol)} as created_at` : `null::timestamptz as created_at`
    ];

    const where = [];
    const params = [];

    const status = req.query.status != null ? String(req.query.status).trim() : '';
    if (status && status !== 'todos' && statusCol) {
      params.push(status);
      where.push(`lower(m.${qIdent(statusCol)}) = lower($${params.length})`);
    }

    const artistId = req.query.artist_id != null ? String(req.query.artist_id).trim() : '';
    if (artistId && artistCol) {
      params.push(artistId);
      where.push(`m.${qIdent(artistCol)}::text = $${params.length}`);
    }

    const { limit, offset } = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    params.push(limit);
    params.push(offset);

    const orderBy = createdAtCol ? `m.${qIdent(createdAtCol)} desc` : `m.${qIdent(idCol)} desc`;
    const sql = `
      select ${selectParts.join(', ')}
        from ${musicTable} m
        ${artistCol ? `left join profiles pf on pf.id = m.${qIdent(artistCol)}` : 'left join profiles pf on 1=0'}
       ${where.length ? `where ${where.join(' and ')}` : ''}
       order by ${orderBy}
       limit $${params.length - 1} offset $${params.length}
    `;

    const { rows } = await timedQuery(req, sql, params, 'admin.musics.list');
    return okPerf(req, res, rows);
  })
);

apiRouter.put(
  '/admin/musics/:id',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const musicTable = await resolveMusicTable();
    if (!musicTable) return bad(res, 404, 'Tabela de músicas não encontrada');

    const cols = await getTableColumns(musicTable);
    const idCol = pickFirstExistingColumn(cols, ['id']);
    if (!idCol) return bad(res, 404, 'Tabela de músicas inválida');

    const id = String(req.params.id || '').trim();
    if (!id) return bad(res, 400, 'ID inválido');

    const payload = req.body || {};
    const allowed = [
      'status',
      'upc',
      'presave_link',
      'release_date',
      'is_beatwap_produced',
      'produced_by',
      'show_on_home',
      'isrc'
    ];

    const sets = [];
    const params = [id];
    for (const key of allowed) {
      if (!cols.has(key)) continue;
      if (!(key in payload)) continue;
      params.push(payload[key]);
      sets.push(`${qIdent(key)} = $${params.length}`);
    }

    if (!sets.length) return bad(res, 400, 'Nada para atualizar');

    const sql = `update ${musicTable} set ${sets.join(', ')} where ${qIdent(idCol)}::text = $1 returning *`;
    const { rows } = await query(sql, params);
    if (!rows[0]) return bad(res, 404, 'Música não encontrada');
    return ok(res, rows[0]);
  })
);

apiRouter.get(
  '/admin/compositions',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    const status = req.query.status == null ? '' : String(req.query.status).trim();
    const composerId = req.query.composer_id == null ? '' : String(req.query.composer_id).trim();

    const cols = await getTableColumns('public.compositions');
    const audioCol = pickFirstExistingColumn(cols, ['audio_url', 'file_url', 'url']);
    const coverCol = pickFirstExistingColumn(cols, ['cover_url', 'image_url']);
    const feedbackCol = pickFirstExistingColumn(cols, ['admin_feedback', 'feedback', 'rejection_reason']);

    const where = [];
    const params = [limit, offset];

    if (status && status !== 'todos') {
      params.push(status);
      where.push(`c.status = $${params.length}`);
    }

    if (composerId) {
      params.push(composerId);
      where.push(`c.composer_id::text = $${params.length}`);
    }

    const selectParts = [
      'c.id',
      'c.composer_id',
      'c.title',
      'c.status',
      audioCol ? `c.${qIdent(audioCol)} as audio_url` : 'null::text as audio_url',
      coverCol ? `c.${qIdent(coverCol)} as cover_url` : 'null::text as cover_url',
      feedbackCol ? `c.${qIdent(feedbackCol)} as admin_feedback` : 'null::text as admin_feedback',
      'c.created_at',
      'p.nome as profile_nome',
      'p.nome_completo_razao_social as profile_nome_completo_razao_social',
      'p.avatar_url as profile_avatar_url'
    ];

    const sql = `
      select ${selectParts.join(', ')}
        from compositions c
        join profiles p on p.id = c.composer_id
       ${where.length ? `where ${where.join(' and ')}` : ''}
       order by c.created_at desc
       limit $1 offset $2
    `;

    const { rows } = await timedQuery(req, sql, params, 'admin.compositions.list');
    const mapped = (rows || []).map((r) => ({
      id: r.id,
      composer_id: r.composer_id,
      title: r.title,
      status: r.status,
      audio_url: r.audio_url,
      cover_url: r.cover_url,
      admin_feedback: r.admin_feedback,
      created_at: r.created_at,
      profiles: {
        nome: r.profile_nome,
        nome_completo_razao_social: r.profile_nome_completo_razao_social,
        avatar_url: r.profile_avatar_url
      }
    }));
    return okPerf(req, res, mapped);
  })
);

apiRouter.put(
  '/admin/compositions/:id/status',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '').trim();
    const status = String(req.body?.status || '').trim().toLowerCase();
    const feedback = req.body?.feedback == null ? null : String(req.body.feedback);

    if (!id) return bad(res, 400, 'ID inválido');
    if (!['pending', 'approved', 'rejected'].includes(status)) return bad(res, 400, 'Status inválido');

    const cols = await getTableColumns('public.compositions');
    const feedbackCol = pickFirstExistingColumn(cols, ['admin_feedback', 'feedback', 'rejection_reason']);

    const sets = ['status = $2'];
    const params = [id, status];

    if (feedbackCol) {
      params.push(feedback);
      sets.push(`${qIdent(feedbackCol)} = $${params.length}`);
    }

    const sql = `
      update compositions
         set ${sets.join(', ')}
       where id = $1
       returning id, composer_id, title, status, created_at
    `;
    const { rows } = await query(sql, params);
    if (!rows[0]) return bad(res, 404, 'Composição não encontrada');
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

apiRouter.put(
  '/admin/profiles/:id',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const targetId = String(req.params.id || '');
    const payload = req.body || {};

    const email = payload.email != null ? String(payload.email).trim().toLowerCase() : null;
    if (email && !email.includes('@')) return bad(res, 400, 'Email inválido');
    if (email) {
      const { rows: existing } = await query('select id from profiles where email = $1 and id <> $2 limit 1', [email, targetId]);
      if (existing[0]) return bad(res, 409, 'Email já está em uso');
    }

    const { rows } = await query(
      `update profiles
          set email = coalesce($2, email),
              nome = coalesce($3, nome),
              nome_completo_razao_social = coalesce($4, nome_completo_razao_social),
              avatar_url = coalesce($5, avatar_url),
              bio = coalesce($6, bio),
              cpf_cnpj = coalesce($7, cpf_cnpj),
              celular = coalesce($8, celular),
              instagram_url = coalesce($9, instagram_url),
              site_url = coalesce($10, site_url),
              youtube_url = coalesce($11, youtube_url),
              spotify_url = coalesce($12, spotify_url),
              deezer_url = coalesce($13, deezer_url),
              tiktok_url = coalesce($14, tiktok_url),
              genero_musical = coalesce($15, genero_musical),
              tema = coalesce($16, tema),
              cep = coalesce($17, cep),
              logradouro = coalesce($18, logradouro),
              complemento = coalesce($19, complemento),
              bairro = coalesce($20, bairro),
              cidade = coalesce($21, cidade),
              estado = coalesce($22, estado),
              plano = coalesce($23, plano),
              updated_at = now()
        where id = $1
      returning id, email, cargo, nome, nome_completo_razao_social, avatar_url, bio, cpf_cnpj, celular, instagram_url, site_url, youtube_url, spotify_url, deezer_url, tiktok_url, genero_musical, tema, cep, logradouro, complemento, bairro, cidade, estado, plano, access_control, created_at, updated_at`,
      [
        targetId,
        email,
        payload.nome != null ? String(payload.nome) : null,
        payload.nome_completo_razao_social != null ? String(payload.nome_completo_razao_social) : null,
        payload.avatar_url != null ? String(payload.avatar_url) : null,
        payload.bio != null ? String(payload.bio) : null,
        payload.cpf_cnpj != null ? String(payload.cpf_cnpj) : null,
        payload.celular != null ? String(payload.celular) : null,
        payload.instagram_url != null ? String(payload.instagram_url) : null,
        payload.site_url != null ? String(payload.site_url) : null,
        payload.youtube_url != null ? String(payload.youtube_url) : null,
        payload.spotify_url != null ? String(payload.spotify_url) : null,
        payload.deezer_url != null ? String(payload.deezer_url) : null,
        payload.tiktok_url != null ? String(payload.tiktok_url) : null,
        payload.genero_musical != null ? String(payload.genero_musical) : null,
        payload.tema != null ? String(payload.tema) : null,
        payload.cep != null ? String(payload.cep) : null,
        payload.logradouro != null ? String(payload.logradouro) : null,
        payload.complemento != null ? String(payload.complemento) : null,
        payload.bairro != null ? String(payload.bairro) : null,
        payload.cidade != null ? String(payload.cidade) : null,
        payload.estado != null ? String(payload.estado) : null,
        payload.plano != null ? String(payload.plano) : null
      ]
    );

    if (!rows[0]) return bad(res, 404, 'Perfil não encontrado');
    return ok(res, rows[0]);
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

apiRouter.get(
  '/releases',
  withPublicCache(
    60000,
    asyncHandler(async (req, res) => {
      const { limit, offset } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
      const { rows } = await timedQuery(
        req,
        'select id, title, cover_url, created_at from releases order by created_at desc limit $1 offset $2',
        [limit, offset],
        'releases.list'
      );
      return okPerf(req, res, rows);
    })
  )
);

apiRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
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
    return okPerf(req, res, rows);
  })
);

apiRouter.get(
  '/producer-projects',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const { rows } = await timedQuery(
      req,
      'select id, producer_id, title, url, platform, published, created_at from producer_projects order by created_at desc',
      [],
      'producer_projects.list'
    );
    const withCover = (rows || []).map((r) => ({ ...r, cover_url: null }));
    return okPerf(req, res, withCover);
  })
);

apiRouter.post(
  '/producer-projects',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const producerId = String(req.body?.producer_id || req.user?.id || '');
    const title = String(req.body?.title || '').trim();
    const url = String(req.body?.url || '').trim();
    const platform = String(req.body?.platform || '').trim();
    const published = req.body?.published == null ? true : !!req.body.published;

    if (!producerId || !title || !url || !platform) return bad(res, 400, 'Dados inválidos');

    const { rows } = await query(
      `insert into producer_projects (id, producer_id, title, url, platform, published)
       values (gen_random_uuid(), $1, $2, $3, $4, $5)
       returning id, producer_id, title, url, platform, published, created_at`,
      [producerId, title, url, platform, published]
    );
    const row = rows[0] ? { ...rows[0], cover_url: null } : null;
    return ok(res, row);
  })
);

apiRouter.delete(
  '/producer-projects/:id',
  authRequired,
  requireRole(['Produtor']),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) return bad(res, 400, 'ID inválido');

    const { rows } = await query('delete from producer_projects where id = $1 returning id', [id]);
    if (!rows[0]) return bad(res, 404, 'Projeto não encontrado');
    return ok(res, { ok: true });
  })
);

apiRouter.get(
  '/composers',
  withPublicCache(
    60000,
    asyncHandler(async (req, res) => {
      const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
      const { rows } = await timedQuery(
        req,
        `select id, nome, nome_completo_razao_social, avatar_url, created_at
           from profiles
          where cargo = 'Compositor'
          order by created_at asc
          limit $1 offset $2`,
        [limit, offset],
        'composers.list'
      );
      return okPerf(req, res, rows);
    })
  )
);

apiRouter.get(
  '/artists',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
    const { rows } = await timedQuery(
      req,
      `select id, nome, nome_completo_razao_social, avatar_url, created_at
         from profiles
        where cargo = 'Artista'
        order by created_at asc
        limit $1 offset $2`,
      [limit, offset],
      'artists.list'
    );
    return okPerf(req, res, rows);
  })
);

apiRouter.get(
  '/producers',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
    const { rows } = await timedQuery(
      req,
      `select id, nome, nome_completo_razao_social, avatar_url, created_at
         from profiles
        where cargo = 'Produtor'
        order by created_at asc
        limit $1 offset $2`,
      [limit, offset],
      'producers.list'
    );
    return okPerf(req, res, rows);
  })
);

apiRouter.get(
  '/sponsors',
  withPublicCache(
    60000,
    asyncHandler(async (req, res) => {
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
      return okPerf(req, res, rows);
    })
  )
);

apiRouter.get(
  '/compositions',
  asyncHandler(async (req, res) => {
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
    return okPerf(req, res, rows);
  })
);

apiRouter.get(
  '/home',
  withPublicCache(
    60000,
    asyncHandler(async (req, res) => {
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
      return okPerf(req, res, {
        releases: row.releases || [],
        compositions: row.compositions || [],
        projects: row.projects || [],
        composers: row.composers || [],
        sponsors: row.sponsors || [],
        artists: row.artists || [],
        producers: row.producers || [],
        sellers: row.sellers || []
      });
    })
  )
);

apiRouter.get('/profiles/:id/musics', (req, res) => ok(res, []));
apiRouter.get('/profiles/:id/feats', (req, res) => ok(res, []));
apiRouter.get('/profiles/:id/produced-musics', (req, res) => ok(res, []));
apiRouter.get('/profiles/:id/compositions', (req, res) => ok(res, []));
apiRouter.get('/sellers/:id/stats', (req, res) => ok(res, null));

apiRouter.get(
  '/profiles/:id/events',
  withPublicCache(
    60000,
    asyncHandler(async (req, res) => {
      const artistId = String(req.params.id || '');
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
        'events.public_by_artist'
      );
      return okPerf(req, res, rows);
    })
  )
);

apiRouter.get(
  '/events',
  withPublicCache(
    60000,
    asyncHandler(async (req, res) => {
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
      return okPerf(req, res, rows);
    })
  )
);

apiRouter.get(
  '/my/events',
  authRequired,
  asyncHandler(async (req, res) => {
    const artistId = String(req.user.id);
    const { rows } = await timedQuery(
      req,
      `select id, artist_id, event_date, location, flyer_url, ticket_price_cents, purchase_contact, created_at
         from public_events
        where artist_id = $1
          and event_date >= now()
        order by event_date asc`,
      [artistId],
      'events.my_list'
    );
    return okPerf(req, res, rows);
  })
);

apiRouter.post(
  '/events',
  authRequired,
  requireRole(['Artista']),
  asyncHandler(async (req, res) => {
    const artistId = String(req.user.id);
    const location = String(req.body?.location || '').trim();
    const flyerUrl = String(req.body?.flyer_url || '').trim();
    const purchaseContact = normalizePurchaseContact(req.body?.purchase_contact);
    const eventDateRaw = req.body?.event_date;
    const ticketPriceCents = parseMoneyToCents(req.body?.ticket_price);

    if (!location) return bad(res, 400, 'Local do show é obrigatório');
    if (!flyerUrl) return bad(res, 400, 'Flyer do show é obrigatório');
    if (!eventDateRaw) return bad(res, 400, 'Data do evento é obrigatória');

    const eventDate = new Date(String(eventDateRaw));
    if (Number.isNaN(eventDate.getTime())) return bad(res, 400, 'Data do evento inválida');

    const { rows } = await query(
      `insert into public_events (artist_id, event_date, location, flyer_url, ticket_price_cents, purchase_contact)
       values ($1,$2,$3,$4,$5,$6)
       returning id, artist_id, event_date, location, flyer_url, ticket_price_cents, purchase_contact, created_at`,
      [artistId, eventDate.toISOString(), location, flyerUrl, ticketPriceCents, purchaseContact || null]
    );
    return ok(res, rows[0]);
  })
);

apiRouter.delete(
  '/events/:id',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '');
    const userId = String(req.user.id);
    const isAdmin = String(req.profile && req.profile.cargo ? req.profile.cargo : '').toLowerCase() === 'produtor';

    const result = isAdmin
      ? await query('delete from public_events where id = $1 returning id', [id])
      : await query('delete from public_events where id = $1 and artist_id = $2 returning id', [id, userId]);

    if (!result.rows[0]) return bad(res, 404, 'Show não encontrado');
    return ok(res, { ok: true });
  })
);

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
  'musics'
];

for (const name of emptyListRoutes) {
  apiRouter.get(`/${name}`, (req, res) => ok(res, []));
}

apiRouter.get('/albums/:id/tracks', (req, res) => ok(res, []));

module.exports = { apiRouter };
