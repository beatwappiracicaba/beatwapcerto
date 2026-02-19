import { query } from '../db.js';
import {
  passwordIsStrong,
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  storeRefreshHash,
  clearRefreshToken,
  matchStoredRefresh,
  lockAccountIfNeeded,
  resetLockAndAudit
} from './auth.service.js';

export const register = async (req, res) => {
  try {
    const { nome, name, email, password, role } = req.body || {};
    const nomeFinal = nome || name || null;
    if (!email || !password || !nomeFinal) {
      return res.status(400).json({ error: 'nome, email e password são obrigatórios' });
    }
    if (!passwordIsStrong(password)) {
      return res.status(400).json({ error: 'Senha fraca. Mín. 8, com número e símbolo.' });
    }
    const exists = await query('select id from users where email=$1', [email]);
    if (exists.rowCount > 0) return res.status(409).json({ error: 'Email já cadastrado' });
    const pwdHash = await hashPassword(password);
    const ins = await query(
      `insert into users (name, email, password, password_hash, role, created_at, failed_attempts) 
       values ($1,$2,$3,$4,$5,now(),0)
       returning id, name, email, role, created_at`,
      [nomeFinal, email, pwdHash, pwdHash, role || 'Artista']
    );
    return res.json(ins.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Informe email e senha' });
    const r = await query('select * from users where email=$1', [email]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
    const user = r.rows[0];
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Conta bloqueada temporariamente. Tente mais tarde.' });
    }
    const hash = user.password_hash || user.password;
    const ok = await comparePassword(password, hash);
    if (!ok) {
      const { attempts, lockedUntil } = await lockAccountIfNeeded(user);
      return res.status(401).json({
        error: 'Credenciais inválidas',
        remaining: Math.max(0, 5 - attempts),
        lockedUntil
      });
    }
    const accessToken = signAccessToken({ id: user.id, role: user.role, name: user.name });
    const refreshToken = signRefreshToken({ id: user.id });
    await storeRefreshHash(user.id, refreshToken);
    await resetLockAndAudit(user.id, req.headers['x-forwarded-for'] || req.ip, req.headers['user-agent']);
    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken é obrigatório' });
    const decoded = verifyRefreshToken(refreshToken);
    const userId = decoded.id;
    const match = await matchStoredRefresh(userId, refreshToken);
    if (!match) return res.status(401).json({ error: 'Refresh token inválido' });
    const r = await query('select id, name, email, role from users where id=$1', [userId]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
    const user = r.rows[0];
    const newAccess = signAccessToken({ id: user.id, role: user.role, name: user.name });
    const newRefresh = signRefreshToken({ id: user.id });
    await storeRefreshHash(user.id, newRefresh);
    return res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
  }
};

export const logout = async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });
    await clearRefreshToken(userId);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
};
