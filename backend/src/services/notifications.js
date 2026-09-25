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

// Contexto da notificacao. Regra da plataforma:
//   'feed'  -> interacoes sociais (curtida, comentario, resposta, seguir).
//               Aparecem somente no sistema de notificacoes do Feed.
//   'admin' -> eventos administrativos (aprovacao de musica, avisos de
//               plataforma, solicitacoes). Aparecem somente no Admin/Dashboard.
//
// O campo `type` continua existindo e significa outra coisa (tonalidade:
// success / error / info). Os dois eixos sao independentes de proposito.
const CONTEXT_FEED = 'feed';
const CONTEXT_ADMIN = 'admin';

function normalizeContext(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === CONTEXT_FEED) return CONTEXT_FEED;
  return CONTEXT_ADMIN;
}

function contextOf(notification) {
  return normalizeContext(notification?.context);
}

function listNotificationsByRecipient(recipientId, context) {
  const rid = normId(recipientId);
  if (!rid) return [];
  const list = ensureList();
  const filtered = list.filter((n) => normId(n?.recipient_id) === rid);
  if (context === undefined || context === null || context === '') return filtered;
  const want = normalizeContext(context);
  return filtered.filter((n) => contextOf(n) === want);
}

function getUnreadCount(recipientId, context) {
  return listNotificationsByRecipient(recipientId, context).filter((n) => !n?.read).length;
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
    context: normalizeContext(input.context),
    link: input.link || null,
    read: false,
    created_at: nowIso(),
  };

  const list = ensureList();
  list.unshift(item);
  scheduleSave();

  // O realtime entrega por contexto: o Feed so reage ao room 'feed' e o
  // Admin so ao 'admin', entao as caixas nao se misturam em tempo real.
  emitEvent('notifications.created', item, `profile:${recipientId}:${item.context}`);
  emitEvent(
    'notifications.unread.updated',
    {
      recipient_id: recipientId,
      context: item.context,
      unread_count: getUnreadCount(recipientId, item.context)
    },
    `profile:${recipientId}:${item.context}`
  );

  return item;
}

// A leitura tambem e por contexto: marcar uma do Feed nao toca no Admin.
function markAsRead(recipientId, notificationId) {
  const rid = normId(recipientId);
  const nid = normId(notificationId);
  if (!rid || !nid) return { ok: false, notFound: true };
  const list = ensureList();
  const idx = list.findIndex((n) => normId(n?.id) === nid && normId(n?.recipient_id) === rid);
  if (idx < 0) return { ok: false, notFound: true };
  if (!list[idx].read) {
    const ctx = contextOf(list[idx]);
    list[idx] = { ...list[idx], read: true };
    scheduleSave();
    emitEvent(
      'notifications.unread.updated',
      { recipient_id: rid, context: ctx, unread_count: getUnreadCount(rid, ctx) },
      `profile:${rid}:${ctx}`
    );
  }
  return { ok: true };
}

function markAllAsRead(recipientId, context) {
  const rid = normId(recipientId);
  if (!rid) return { ok: false };
  const list = ensureList();
  const want = normalizeContext(context);
  let changed = false;
  for (let i = 0; i < list.length; i += 1) {
    if (normId(list[i]?.recipient_id) !== rid) continue;
    if (contextOf(list[i]) !== want) continue;
    if (list[i].read) continue;
    list[i] = { ...list[i], read: true };
    changed = true;
  }
  if (changed) {
    scheduleSave();
    emitEvent(
      'notifications.unread.updated',
      { recipient_id: rid, context: want, unread_count: 0 },
      `profile:${rid}:${want}`
    );
  }
  return { ok: true };
}

module.exports = {
  CONTEXT_FEED,
  CONTEXT_ADMIN,
  createNotification,
  listNotificationsByRecipient,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  contextOf
};
