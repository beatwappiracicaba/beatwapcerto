const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  try {
    const h = String(req.headers.authorization || '');
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'Sem token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = { id: payload.sub, email: payload.email, cargo: payload.cargo };
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}

module.exports = { auth };
