import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  const auth = req.headers.authorization ? String(req.headers.authorization) : '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  const token = auth.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

