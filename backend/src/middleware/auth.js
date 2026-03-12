import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const DB_AUTH_TIMEOUT_MS = 1200;
const AUTH_STATE_TTL_MS = 60_000;
const USER_EXISTS_TTL_MS = 60_000;

const authStateCache = { revokedBefore: null, fetchedAt: 0 };
const userExistsCache = new Map();

async function queryWithStatementTimeout(text, values, timeoutMs) {
  const ms = Number(timeoutMs) || 0;
  const client = await pool.connect();
  let hasSet = false;
  try {
    if (ms > 0) {
      await client.query(`SET statement_timeout TO ${Math.floor(ms)}`);
      hasSet = true;
    }
    return await client.query(text, values);
  } finally {
    if (hasSet) {
      try {
        await client.query('SET statement_timeout TO DEFAULT');
      } catch {
        void 0;
      }
    }
    client.release();
  }
}

async function getRevokedBefore() {
  const now = Date.now();
  if (now - authStateCache.fetchedAt < AUTH_STATE_TTL_MS) return authStateCache.revokedBefore;
  authStateCache.fetchedAt = now;
  try {
    const { rows } = await queryWithStatementTimeout(
      'SELECT revoked_before FROM public.auth_state WHERE id = 1 LIMIT 1',
      [],
      DB_AUTH_TIMEOUT_MS
    );
    authStateCache.revokedBefore = rows[0] && rows[0].revoked_before ? new Date(rows[0].revoked_before) : null;
    if (authStateCache.revokedBefore && Number.isNaN(authStateCache.revokedBefore.getTime())) authStateCache.revokedBefore = null;
    return authStateCache.revokedBefore;
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code || '') : '';
    if (code === '42P01') {
      authStateCache.revokedBefore = null;
      return null;
    }
    return authStateCache.revokedBefore;
  }
}

async function getUserExists(userId) {
  const id = userId ? String(userId) : '';
  if (!id) return false;
  const now = Date.now();
  const cached = userExistsCache.get(id);
  if (cached && now - cached.fetchedAt < USER_EXISTS_TTL_MS) return cached.exists === true;
  try {
    const { rows } = await queryWithStatementTimeout(
      'SELECT 1 FROM public.profiles WHERE id = $1 LIMIT 1',
      [id],
      DB_AUTH_TIMEOUT_MS
    );
    const exists = !!(rows && rows[0]);
    userExistsCache.set(id, { exists, fetchedAt: now });
    return exists;
  } catch (err) {
    if (cached && now - cached.fetchedAt < 5 * 60 * 1000) return cached.exists === true;
    throw err;
  }
}

export async function authRequired(req, res, next) {
  const auth = req.headers.authorization ? String(req.headers.authorization) : '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  const token = auth.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded && typeof decoded === 'object' && 'id' in decoded ? String(decoded.id || '') : '';
    if (!userId) return res.status(401).json({ error: 'Token inválido ou expirado' });
    try {
      const revokedBefore = await getRevokedBefore();
      if (revokedBefore) {
        const iatSeconds = decoded && typeof decoded === 'object' && 'iat' in decoded ? Number(decoded.iat || 0) : 0;
        if (iatSeconds > 0) {
          const issuedAtMs = iatSeconds * 1000;
          if (issuedAtMs < revokedBefore.getTime()) {
            return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
          }
        }
      }
      const exists = await getUserExists(userId);
      if (!exists) {
        return res.status(401).json({ error: 'Conta não existe mais. Faça login novamente.' });
      }
    } catch (e) {
      return res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente.' });
    }
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
