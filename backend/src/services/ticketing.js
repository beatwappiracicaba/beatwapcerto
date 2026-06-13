const crypto = require('crypto');
const { Op } = require('sequelize');

function normalizeSlug(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function normalizeTicketTypeId(raw, fallback) {
  const base = normalizeSlug(raw);
  if (base) return base;
  return normalizeSlug(fallback) || `ticket-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTicketTypes(input) {
  const list = Array.isArray(input) ? input : [];
  const out = [];
  const used = new Set();

  for (let index = 0; index < list.length; index += 1) {
    const item = list[index] && typeof list[index] === 'object' ? list[index] : {};
    const name = String(item.name || item.title || '').trim();
    const quantityRaw = Number(item.quantity ?? item.available_quantity ?? item.stock ?? 0);
    const quantity = Number.isFinite(quantityRaw) ? Math.max(0, Math.floor(quantityRaw)) : 0;
    const priceRaw = Number(item.price_cents ?? item.unit_price_cents ?? item.price ?? 0);
    const price_cents = Number.isFinite(priceRaw)
      ? Math.max(0, priceRaw > 1000 ? Math.round(priceRaw) : Math.round(priceRaw * 100))
      : 0;

    if (!name || quantity <= 0) continue;

    let id = normalizeTicketTypeId(item.id || item.ticket_type_id, `${name}-${index + 1}`);
    while (used.has(id)) {
      id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
    }
    used.add(id);

    out.push({
      id,
      name,
      description: String(item.description || '').trim() || null,
      price_cents,
      quantity,
      active: item.active !== false
    });
  }

  return out;
}

function getOrderMetadata(order) {
  const meta = order?.metadata_json;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  return meta;
}

function getReservationState(order, nowMs = Date.now()) {
  const status = String(order?.status || '').toLowerCase().trim();
  if (status === 'approved' || order?.access_granted_at) return 'approved';
  if (status === 'cancelled' || status === 'rejected' || status === 'refunded' || status === 'charged_back' || status === 'fraud') {
    return 'inactive';
  }

  const createdAt = new Date(order?.created_at || order?.createdAt || 0).getTime();
  const expiresMs = createdAt + (30 * 60 * 1000);
  if (!Number.isFinite(createdAt) || !createdAt) return 'inactive';
  if (expiresMs <= nowMs) return 'inactive';
  return 'reserved';
}

async function getInventoryForEvent(event, models, options = {}) {
  const { PaymentOrder, EventTicket } = models;
  const eventId = String(event?.id || '').trim();
  const ignoreOrderId = String(options.ignoreOrderId || '').trim();
  const transaction = options.transaction;
  const nowMs = Date.now();

  const ticketTypes = normalizeTicketTypes(event?.ticket_types);
  const byType = new Map(
    ticketTypes.map((type) => [
      type.id,
      {
        ...type,
        sold: 0,
        reserved: 0,
        available: type.quantity
      }
    ])
  );

  const tickets = await EventTicket.findAll({
    where: { event_id: eventId },
    transaction
  });

  for (const ticket of tickets) {
    const status = String(ticket?.status || 'issued').toLowerCase().trim();
    if (status === 'cancelled') continue;
    const typeId = String(ticket?.ticket_type_id || '').trim();
    const current = byType.get(typeId);
    if (!current) continue;
    current.sold += 1;
  }

  const orders = await PaymentOrder.findAll({
    where: {
      product_type: 'event_ticket',
      product_key: eventId,
      [Op.or]: [
        { access_granted_at: { [Op.ne]: null } },
        { created_at: { [Op.gte]: new Date(nowMs - (6 * 60 * 60 * 1000)) } }
      ]
    },
    transaction
  });

  for (const order of orders) {
    if (ignoreOrderId && String(order?.id || '') === ignoreOrderId) continue;
    const state = getReservationState(order, nowMs);
    if (state !== 'reserved') continue;

    const meta = getOrderMetadata(order);
    const items = Array.isArray(meta.ticket_items) ? meta.ticket_items : [];
    for (const item of items) {
      const typeId = String(item?.ticket_type_id || '').trim();
      const quantity = Number(item?.quantity || 0);
      const count = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
      const current = byType.get(typeId);
      if (!current || count <= 0) continue;
      current.reserved += count;
    }
  }

  let totalSold = 0;
  let totalReserved = 0;
  let totalAvailable = 0;
  for (const current of byType.values()) {
    current.available = Math.max(0, current.quantity - current.sold - current.reserved);
    totalSold += current.sold;
    totalReserved += current.reserved;
    totalAvailable += current.available;
  }

  return {
    ticket_types: Array.from(byType.values()),
    totals: {
      quantity: ticketTypes.reduce((acc, type) => acc + type.quantity, 0),
      sold: totalSold,
      reserved: totalReserved,
      available: totalAvailable
    }
  };
}

function serializeEventForPublic(event, inventory) {
  const src = event?.toJSON ? event.toJSON() : event;
  const inv = inventory || { ticket_types: [], totals: { quantity: 0, sold: 0, reserved: 0, available: 0 } };
  const minPrice = inv.ticket_types.length
    ? Math.min(...inv.ticket_types.map((type) => Number(type.price_cents || 0)))
    : 0;

  return {
    id: src.id,
    slug: src.slug,
    title: src.title,
    subtitle: src.subtitle || null,
    description: src.description || null,
    banner_url: src.banner_url || null,
    venue_name: src.venue_name,
    venue_city: src.venue_city || null,
    venue_address: src.venue_address || null,
    starts_at: src.starts_at,
    sales_ends_at: src.sales_ends_at || null,
    contact_phone: src.contact_phone || null,
    published: src.published === true,
    ticket_types: inv.ticket_types.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description || null,
      price_cents: Number(type.price_cents || 0),
      quantity: Number(type.quantity || 0),
      sold: Number(type.sold || 0),
      reserved: Number(type.reserved || 0),
      available: Number(type.available || 0),
      sold_out: Number(type.available || 0) <= 0,
      active: type.active !== false
    })),
    totals: inv.totals,
    min_price_cents: minPrice,
    created_at: src.created_at || src.createdAt || null,
    updated_at: src.updated_at || src.updatedAt || null
  };
}

function randomCode(prefix, size = 8) {
  const bytes = crypto.randomBytes(Math.max(4, size));
  return `${prefix}${bytes.toString('hex').slice(0, size).toUpperCase()}`;
}

function buildQrValue(ticket) {
  return `beatwap-ticket:${String(ticket?.qr_token || '').trim()}`;
}

function serializeTicketInvite(ticket, event) {
  const t = ticket?.toJSON ? ticket.toJSON() : ticket;
  const e = event?.toJSON ? event.toJSON() : event;
  const checkedIn = !!t.checked_in_at;
  return {
    id: t.id,
    invite_code: t.invite_code,
    qr_token: t.qr_token,
    qr_value: buildQrValue(t),
    status: checkedIn ? 'checked_in' : String(t.status || 'issued'),
    checked_in_at: t.checked_in_at || null,
    buyer_name: t.buyer_name,
    buyer_email: t.buyer_email,
    buyer_phone: t.buyer_phone || null,
    ticket_type_id: t.ticket_type_id,
    ticket_type_name: t.ticket_type_name,
    unit_price_cents: Number(t.unit_price_cents || 0),
    event: {
      id: e?.id || null,
      slug: e?.slug || null,
      title: e?.title || null,
      subtitle: e?.subtitle || null,
      venue_name: e?.venue_name || null,
      venue_city: e?.venue_city || null,
      venue_address: e?.venue_address || null,
      starts_at: e?.starts_at || null,
      banner_url: e?.banner_url || null,
      contact_phone: e?.contact_phone || null
    }
  };
}

async function issueTicketsForApprovedOrder(order, models, options = {}) {
  const { Event, EventTicket, PaymentOrder } = models;
  const transaction = options.transaction;
  const meta = getOrderMetadata(order);
  const eventId = String(meta.event_id || '').trim();
  const items = Array.isArray(meta.ticket_items) ? meta.ticket_items : [];
  if (!eventId || items.length === 0) return { ok: false, reason: 'INVALID_TICKET_ORDER' };

  const event = await Event.findByPk(eventId, { transaction });
  if (!event) return { ok: false, reason: 'EVENT_NOT_FOUND' };

  const existing = await EventTicket.findAll({
    where: { order_id: order.id },
    transaction
  });
  if (existing.length > 0) {
    return { ok: true, type: 'event_ticket', event, tickets: existing };
  }

  const inventory = await getInventoryForEvent(
    event,
    { PaymentOrder, EventTicket },
    { transaction, ignoreOrderId: order.id }
  );
  const byType = new Map(inventory.ticket_types.map((type) => [String(type.id), type]));

  for (const item of items) {
    const typeId = String(item?.ticket_type_id || '').trim();
    const quantity = Number(item?.quantity || 0);
    const count = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
    const current = byType.get(typeId);
    if (!current || count <= 0) return { ok: false, reason: 'INVALID_TICKET_ITEM' };
    if (current.available < count) return { ok: false, reason: 'SOLD_OUT' };
  }

  const createdTickets = [];
  for (const item of items) {
    const count = Math.max(0, Math.floor(Number(item.quantity || 0)));
    for (let index = 0; index < count; index += 1) {
      const ticket = await EventTicket.create({
        event_id: event.id,
        order_id: order.id,
        buyer_name: order.customer_name || item.buyer_name || 'Comprador',
        buyer_email: order.customer_email || item.buyer_email || '',
        buyer_phone: meta.buyer_phone || null,
        ticket_type_id: item.ticket_type_id,
        ticket_type_name: item.ticket_type_name,
        unit_price_cents: Number(item.unit_price_cents || 0),
        invite_code: randomCode('BW', 10),
        qr_token: randomCode('qr_', 32).toLowerCase(),
        status: 'issued',
        metadata_json: {
          event_slug: event.slug,
          event_title: event.title,
          external_reference: order.external_reference,
          checkout_payment_id: payment?.id || null
        }
      }, { transaction });
      createdTickets.push(ticket);
    }
  }

  return { ok: true, type: 'event_ticket', event, tickets: createdTickets };
}

module.exports = {
  normalizeSlug,
  normalizeTicketTypes,
  getOrderMetadata,
  getInventoryForEvent,
  serializeEventForPublic,
  serializeTicketInvite,
  issueTicketsForApprovedOrder,
  buildQrValue
};
