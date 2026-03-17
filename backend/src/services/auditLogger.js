const { AuditLog } = require('../models');

async function logAudit({ action, email = null, user_id = null, status, ip = null, user_agent = null, details = null }) {
  try {
    await AuditLog.create({
      action,
      email,
      user_id,
      status,
      ip,
      user_agent,
      details
    });
  } catch (e) {
    // fallback: console only
    try {
      console.warn('[audit-fallback]', JSON.stringify({ action, email, user_id, status, ip, detailsPresent: !!details }));
    } catch {}
  }
  try {
    console.log('[audit]', JSON.stringify({ action, email, user_id, status, ip, ua: user_agent ? String(user_agent).slice(0, 120) : null }));
  } catch {}
}

module.exports = { logAudit };
