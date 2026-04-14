const { memory, scheduleSave } = require('../memoryStore');
const { emitEvent } = require('../realtime');

function normId(value) {
  const v = String(value ?? '').trim();
  return v || null;
}

function nowIso() {
  return new Date().toISOString();
}

function ensureList() {
  if (!Array.isArray(memory.notifications)) memory.notifications = [];
  return memory.notifications;
}

function listNotificationsByRecipient(recipientId) {
  const rid = normId(recipientId);
  if (!rid) return [];
  const list = ensureList();
  return list.filter((n) => normId(n?.recipient_id) === rid);
}

function getUnreadCount(recipientId) {
  return listNotificationsByRecipient(recipientId).filter((n) => !n?.read).length;
}

function createNotification(input = {}) {
  const recipientId = normId(input.recipient_id ?? input.recipientId);
  if (!recipientId) return null;

  const item = {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recipient_id: recipientId,
    title: String(input.title || 'Notificacao'),
    message: String(input.message || ''),
    type: String(input.type || 'info'),
    link: input.link || null,
    read: false,
    created_at: nowIso(),
  };

  const list = ensureList();
  list.unshift(item);
  scheduleSave();

  emitEvent('notifications.created', item, `profile:${recipientId}`);
  emitEvent(
    'notifications.unread.updated',
    { recipient_id: recipientId, unread_count: getUnreadCount(recipientId) },
    `profile:${recipientId}`
  );

  return item;
}

function markAsRead(recipientId, notificationId) {
  const rid = normId(recipientId);
  const nid = normId(notificationId);
  if (!rid || !nid) return { ok: false, notFound: true };
  const list = ensureList();
  const idx = list.findIndex((n) => normId(n?.id) === nid && normId(n?.recipient_id) === rid);
  if (idx < 0) return { ok: false, notFound: true };
  if (!list[idx].read) {
    list[idx] = { ...list[idx], read: true };
    scheduleSave();
    emitEvent(
      'notifications.unread.updated',
      { recipient_id: rid, unread_count: getUnreadCount(rid) },
      `profile:${rid}`
    );
  }
  return { ok: true };
}

function markAllAsRead(recipientId) {
  const rid = normId(recipientId);
  if (!rid) return { ok: false };
  const list = ensureList();
  let changed = false;
  for (let i = 0; i < list.length; i += 1) {
    if (normId(list[i]?.recipient_id) !== rid) continue;
    if (list[i]?.read) continue;
    list[i] = { ...list[i], read: true };
    changed = true;
  }
  if (changed) {
    scheduleSave();
    emitEvent(
      'notifications.unread.updated',
      { recipient_id: rid, unread_count: 0 },
      `profile:${rid}`
    );
  }
  return { ok: true };
}

module.exports = {
  createNotification,
  listNotificationsByRecipient,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
