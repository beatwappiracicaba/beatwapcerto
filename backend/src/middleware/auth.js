const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (!token) return res.status(401).json({ ok: false, error: 'Não autenticado' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}

function requireRole(roles) {
  const allowed = new Set((Array.isArray(roles) ? roles : [roles]).map(r => String(r)));
  return (req, res, next) => {
    const cargo = req?.user?.cargo;
    if (!cargo || !allowed.has(cargo)) return res.status(403).json({ ok: false, error: 'Acesso negado' });
    next();
  };
}

module.exports = { authRequired, requireRole };
