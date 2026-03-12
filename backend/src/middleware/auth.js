import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const authStateCache = { revokedBefore: null, fetchedAt: 0 };
const userExistsCache = new Map();

async function getRevokedBefore() {
  const now = Date.now();
  if (now - authStateCache.fetchedAt < 5000) return authStateCache.revokedBefore;
  authStateCache.fetchedAt = now;
  try {
    const { rows } = await pool.query('SELECT revoked_before FROM public.auth_state WHERE id = 1 LIMIT 1');
    authStateCache.revokedBefore = rows[0] && rows[0].revoked_before ? new Date(rows[0].revoked_before) : null;
    if (authStateCache.revokedBefore && Number.isNaN(authStateCache.revokedBefore.getTime())) authStateCache.revokedBefore = null;
    return authStateCache.revokedBefore;
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code || '') : '';
    if (code === '42P01') {
      authStateCache.revokedBefore = null;
      return null;
    }
    throw err;
  }
}

async function getUserExists(userId) {
  const id = userId ? String(userId) : '';
  if (!id) return false;
  const now = Date.now();
  const cached = userExistsCache.get(id);
  if (cached && now - cached.fetchedAt < 5000) return cached.exists === true;
  const { rows } = await pool.query('SELECT 1 FROM public.profiles WHERE id = $1 LIMIT 1', [id]);
  const exists = !!(rows && rows[0]);
  userExistsCache.set(id, { exists, fetchedAt: now });
  return exists;
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
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
