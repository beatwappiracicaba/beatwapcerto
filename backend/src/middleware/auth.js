const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { query } = require('../db');

function getBearerToken(req) {
  const raw = req.headers.authorization || req.headers.Authorization;
  if (!raw) return null;
  const value = String(raw);
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  return value.slice('bearer '.length).trim();
}

async function authRequired(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, error: 'Autenticação necessária' });
    const payload = jwt.verify(token, config.jwtSecret);
    const userId = payload && payload.sub ? String(payload.sub) : null;
    if (!userId) return res.status(401).json({ success: false, error: 'Token inválido' });

    const { rows } = await query(
      'select id, email, cargo, nome, nome_completo_razao_social, avatar_url, plano, access_control from profiles where id = $1 limit 1',
      [userId]
    );
    const profile = rows[0] || null;
    if (!profile) return res.status(401).json({ success: false, error: 'Usuário não encontrado' });

    req.user = { id: String(profile.id), email: profile.email, cargo: profile.cargo };
    req.profile = profile;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

function requireRole(roles) {
  const normalized = Array.isArray(roles) ? roles : [roles];
  const allowed = new Set(normalized.map((r) => String(r).toLowerCase()));
  return (req, res, next) => {
    const cargo = String(req?.profile?.cargo || req?.user?.cargo || '').toLowerCase();
    if (!allowed.has(cargo)) return res.status(403).json({ success: false, error: 'Acesso negado' });
    next();
  };
}

module.exports = { authRequired, requireRole, getBearerToken };
