const crypto = require('crypto');
const { getAnalyticsSalt } = require('../config/secrets');

function getClientIp(req) {
  const xf = req?.headers?.['x-forwarded-for'];
  const first = typeof xf === 'string' ? xf.split(',')[0] : (Array.isArray(xf) ? xf[0] : null);
  const raw = first || req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || '';
  return String(raw || '').trim().replace(/^::ffff:/, '') || 'unknown';
}

function getClientHash(req) {
  const ip = getClientIp(req);
  const ua = String(req?.headers?.['user-agent'] || '').trim();
  return crypto
    .createHash('sha256')
    .update(`${ip}|${ua}|${getAnalyticsSalt()}`)
    .digest('hex')
    .slice(0, 32);
}

module.exports = {
  getClientHash,
  getClientIp
};
