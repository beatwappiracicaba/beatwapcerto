import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const SALT_ROUNDS = 12;
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

export const passwordIsStrong = (pwd) => {
  if (typeof pwd !== 'string') return false;
  return /^(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(pwd);
};

export const hashPassword = (pwd) => bcrypt.hash(pwd, SALT_ROUNDS);
export const comparePassword = (pwd, hash) => bcrypt.compare(pwd, hash);

export const signAccessToken = (payload) => {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not set');
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
};

export const signRefreshToken = (payload) => {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not set');
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
};

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

export const storeRefreshHash = async (userId, token) => {
  const hash = await bcrypt.hash(token, SALT_ROUNDS);
  await query('update users set refresh_token=$1 where id=$2', [hash, userId]);
};

export const clearRefreshToken = async (userId) => {
  await query('update users set refresh_token=null where id=$1', [userId]);
};

export const matchStoredRefresh = async (userId, token) => {
  const r = await query('select refresh_token from users where id=$1', [userId]);
  const hash = r.rows[0]?.refresh_token || null;
  if (!hash) return false;
  return bcrypt.compare(token, hash);
};

export const lockAccountIfNeeded = async (user) => {
  const attempts = Number(user.failed_attempts || 0) + 1;
  let lockedUntil = null;
  if (attempts >= 5) {
    lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  await query(
    'update users set failed_attempts=$1, locked_until=$2 where id=$3',
    [attempts, lockedUntil, user.id]
  );
  return { attempts, lockedUntil };
};

export const resetLockAndAudit = async (userId, ip, ua) => {
  await query(
    'update users set failed_attempts=0, locked_until=null, last_login=now(), last_ip=$1, last_user_agent=$2 where id=$3',
    [ip || null, ua || null, userId]
  );
};
