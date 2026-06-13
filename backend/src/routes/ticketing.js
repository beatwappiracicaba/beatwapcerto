const express = require('express');
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const { getJwtSecret } = require('../config/secrets');
const { Event, EventTicket, PaymentOrder } = require('../models');
const {
  normalizeSlug,
  normalizeTicketTypes,
  getOrderMetadata,
  getInventoryForEvent,
  serializeEventForPublic,
  serializeTicketInvite
} = require('../services/ticketing');

const router = express.Router();

function mpEnv(key, fallback = '') {
  const value = process.env[key];
  if (value == null) return fallback;
  return String(value).trim();
}

function mpRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const token = mpEnv('MP_ACCESS_TOKEN') || mpEnv('ACCESS_TOKEN');
    if (!token) {
      const err = new Error('MP_ACCESS_TOKEN não configurado');
      err.status = 500;
      reject(err);
      return;
    }

    const base = mpEnv('MP_API_BASE_URL', 'https://api.mercadopago.com');
    const url = new URL(String(path || ''), base);
    const payload = body != null ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': String(payload.length) } : {}),
      ...extraHeaders
    };

    const req = https.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
          return;
        }
        const err = new Error((data && (data.message || data.error)) || `Mercado Pago error (${res.statusCode})`);
        err.status = res.statusCode || 500;
        err.data = data;
        reject(err);
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function pickWebhookUrl() {
  const direct = mpEnv('MP_WEBHOOK_URL');
  if (direct) return direct;
  const base = mpEnv('APP_PUBLIC_URL', mpEnv('APP_PUBLIC_API_URL', ''));
  if (!base) return '';
  const norm = String(base).trim().replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${norm}/api/webhook`;
}

function pickFrontendUrl() {
  const base = mpEnv('APP_PUBLIC_URL', '');
  const fe = mpEnv('FRONTEND_PUBLIC_URL', '');
  if (fe) return fe.replace(/\/+$/, '');
  if (base) return base.replace(/\/+$/, '');
  return '';
}

function requireProducer(req, res) {
  if (String(req.user?.cargo || '') !== 'Produtor') {
    res.status(403).json({ error: 'Sem permissão' });
    return false;
  }
  return true;
}

function getOptionalUser(req) {
  try {
    const h = String(req.headers.authorization || '');
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token) return null;
    const payload = jwt.verify(token, getJwtSecret());
    return { id: payload.sub, email: payload.email, cargo: payload.cargo };
  } catch {
    return null;
  }
}

async function buildUniqueSlug(title, currentId = '') {
  const base = normalizeSlug(title) || `evento-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (true) {
    const exists = await Event.findOne({ where: { slug: candidate } });
    if (!exists || String(exists.id) === String(currentId || '')) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function normalizeEventPayload(body = {}) {
  const ticket_types = normalizeTicketTypes(body.ticket_types || body.ticketTypes || []);
  return {
    title: String(body.title || '').trim(),
    subtitle: String(body.subtitle || '').trim() || null,
    description: String(body.description || '').trim() || null,
    banner_url: String(body.banner_url || body.bannerUrl || '').trim() || null,
    venue_name: String(body.venue_name || body.venueName || '').trim(),
    venue_city: String(body.venue_city || body.venueCity || '').trim() || null,
    venue_address: String(body.venue_address || body.venueAddress || '').trim() || null,
    starts_at: body.starts_at ? new Date(body.starts_at) : null,
    sales_ends_at: body.sales_ends_at ? new Date(body.sales_ends_at) : null,
    contact_phone: String(body.contact_phone || body.contactPhone || '').trim() || null,
    published: body.published === true || String(body.published || '').toLowerCase() === 'true',
    ticket_types
  };
}

function normalizeCheckoutItems(body, event) {
  const eventTypes = normalizeTicketTypes(event?.ticket_types);
  const byType = new Map(eventTypes.map((type) => [String(type.id), type]));
  const rawItems = Array.isArray(body?.items) && body.items.length
    ? body.items
    : [{ ticket_type_id: body?.ticket_type_id || body?.ticketTypeId, quantity: body?.quantity || 1 }];
  const normalized = [];

  for (const raw of rawItems) {
    const typeId = String(raw?.ticket_type_id || raw?.id || '').trim();
    const current = byType.get(typeId);
    const quantity = Number(raw?.quantity || 0);
    const count = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
    if (!current || count <= 0 || current.active === false) continue;
    normalized.push({
      ticket_type_id: current.id,
      ticket_type_name: current.name,
      unit_price_cents: Number(current.price_cents || 0),
      quantity: count
    });
  }

  return normalized;
}

router.get('/ticketing/events', async (req, res) => {
  try {
    const rows = await Event.findAll({ where: { published: true } });
    const payload = [];
    for (const event of rows) {
      const inventory = await getInventoryForEvent(event, { PaymentOrder, EventTicket });
      payload.push(serializeEventForPublic(event, inventory));
    }
    payload.sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0));
    res.json(payload);
  } catch {
    res.json([]);
  }
});

router.get('/ticketing/manage/events', auth, async (req, res) => {
  try {
    if (!requireProducer(req, res)) return;
    const rows = await Event.findAll({
      where: { created_by: req.user.id }
    });
    const payload = [];
    for (const event of rows) {
      const inventory = await getInventoryForEvent(event, { PaymentOrder, EventTicket });
      payload.push({
        ...serializeEventForPublic(event, inventory),
        tickets_issued: Number(inventory.totals.sold || 0),
        tickets_reserved: Number(inventory.totals.reserved || 0)
      });
    }
    payload.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    res.json(payload);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/ticketing/events/:slug', async (req, res) => {
  try {
    const reference = String(req.params.slug || '').trim();
    let event = await Event.findOne({
      where: {
        published: true,
        [Op.or]: [
          { slug: reference },
          { id: reference }
        ]
      }
    });
    if (!event) {
      const viewer = getOptionalUser(req);
      if (viewer && String(viewer.cargo || '') === 'Produtor') {
        event = await Event.findOne({
          where: {
            created_by: viewer.id,
            [Op.or]: [
              { slug: reference },
              { id: reference }
            ]
          }
        });
      }
    }
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    const inventory = await getInventoryForEvent(event, { PaymentOrder, EventTicket });
    res.json(serializeEventForPublic(event, inventory));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/ticketing/events', auth, async (req, res) => {
  try {
    if (!requireProducer(req, res)) return;
    const payload = normalizeEventPayload(req.body);
    if (!payload.title || !payload.venue_name || !payload.starts_at || Number.isNaN(payload.starts_at.getTime())) {
      return res.status(400).json({ error: 'Preencha título, local e data do evento' });
    }
    if (!payload.ticket_types.length) {
      return res.status(400).json({ error: 'Cadastre pelo menos um lote de ingresso' });
    }

    const slug = await buildUniqueSlug(req.body?.slug || payload.title);
    const created = await Event.create({
      created_by: req.user.id,
      slug,
      ...payload
    });
    const inventory = await getInventoryForEvent(created, { PaymentOrder, EventTicket });
    res.json(serializeEventForPublic(created, inventory));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/ticketing/events/:id', auth, async (req, res) => {
  try {
    if (!requireProducer(req, res)) return;
    const id = String(req.params.id || '').trim();
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    if (String(event.created_by || '') !== String(req.user.id || '')) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const payload = normalizeEventPayload(req.body);
    if (!payload.title || !payload.venue_name || !payload.starts_at || Number.isNaN(payload.starts_at.getTime())) {
      return res.status(400).json({ error: 'Preencha título, local e data do evento' });
    }
    if (!payload.ticket_types.length) {
      return res.status(400).json({ error: 'Cadastre pelo menos um lote de ingresso' });
    }

    const slug = await buildUniqueSlug(req.body?.slug || payload.title, event.id);
    await event.update({
      slug,
      ...payload
    });
    const inventory = await getInventoryForEvent(event, { PaymentOrder, EventTicket });
    res.json(serializeEventForPublic(event, inventory));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/ticketing/events/:id', auth, async (req, res) => {
  try {
    if (!requireProducer(req, res)) return;
    const id = String(req.params.id || '').trim();
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    if (String(event.created_by || '') !== String(req.user.id || '')) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const inventory = await getInventoryForEvent(event, { PaymentOrder, EventTicket });
    if (Number(inventory?.totals?.sold || 0) > 0 || Number(inventory?.totals?.reserved || 0) > 0) {
      return res.status(409).json({ error: 'Este evento já possui ingressos emitidos ou reservas ativas e não pode ser apagado.' });
    }

    await PaymentOrder.destroy({
      where: {
        product_type: 'event_ticket',
        product_key: event.id,
        access_granted_at: null
      }
    });
    await EventTicket.destroy({ where: { event_id: event.id } });
    await event.destroy();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/ticketing/events/:slug/checkout', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const event = await Event.findOne({ where: { slug, published: true } });
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    const salesDeadlineMs = new Date(event.sales_ends_at || event.starts_at || 0).getTime();
    if (Number.isFinite(salesDeadlineMs) && salesDeadlineMs <= Date.now()) {
      return res.status(409).json({ error: 'As vendas deste evento já foram encerradas.' });
    }

    const buyer_name = String(req.body?.buyer_name || req.body?.name || '').trim();
    const buyer_email = String(req.body?.buyer_email || req.body?.email || '').trim();
    const buyer_phone = String(req.body?.buyer_phone || req.body?.phone || '').trim() || null;
    if (!buyer_name || !buyer_email) {
      return res.status(400).json({ error: 'Informe nome e email do comprador' });
    }

    const items = normalizeCheckoutItems(req.body, event);
    if (!items.length) return res.status(400).json({ error: 'Selecione pelo menos um ingresso válido' });

    const inventory = await getInventoryForEvent(event, { PaymentOrder, EventTicket });
    const byType = new Map(inventory.ticket_types.map((type) => [String(type.id), type]));
    let totalQuantity = 0;
    let totalAmount = 0;
    for (const item of items) {
      const current = byType.get(String(item.ticket_type_id));
      if (!current) return res.status(400).json({ error: 'Lote inválido' });
      if (Number(current.available || 0) < Number(item.quantity || 0)) {
        return res.status(409).json({ error: `O lote "${current.name}" não possui quantidade suficiente disponível.` });
      }
      totalQuantity += Number(item.quantity || 0);
      totalAmount += Number(item.unit_price_cents || 0) * Number(item.quantity || 0);
    }

    const idempotency_key = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const external_reference = `evt_${Date.now()}_${idempotency_key.slice(0, 8)}`;
    const order = await PaymentOrder.create({
      profile_id: null,
      status: 'created',
      product_type: 'event_ticket',
      product_key: event.id,
      quantity: totalQuantity,
      amount_cents: totalAmount,
      currency: 'BRL',
      description: `Ingressos - ${event.title}`,
      customer_name: buyer_name,
      customer_email: buyer_email,
      external_reference,
      idempotency_key,
      metadata_json: {
        kind: 'event_ticket',
        event_id: event.id,
        event_slug: event.slug,
        event_title: event.title,
        buyer_phone,
        ticket_items: items
      }
    });

    const frontendUrl = pickFrontendUrl();
    const baseReturn = frontendUrl
      ? `${frontendUrl.replace(/\/+$/, '')}/pagamento/retorno`
      : '';
    const webhookUrl = pickWebhookUrl();

    const preference = {
      items: [
        {
          title: `Ingressos - ${event.title}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number((totalAmount / 100).toFixed(2))
        }
      ],
      payer: {
        name: buyer_name,
        email: buyer_email
      },
      external_reference,
      ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      ...(baseReturn
        ? {
          back_urls: {
            success: `${baseReturn}?status=success&external_reference=${encodeURIComponent(external_reference)}`,
            pending: `${baseReturn}?status=pending&external_reference=${encodeURIComponent(external_reference)}`,
            failure: `${baseReturn}?status=failure&external_reference=${encodeURIComponent(external_reference)}`
          },
          auto_return: 'approved'
        }
        : {}),
      metadata: {
        order_id: order.id,
        event_id: event.id,
        product_type: 'event_ticket',
        product_key: event.id,
        quantity: totalQuantity
      }
    };

    const created = await mpRequest('POST', '/checkout/preferences', preference, { 'X-Idempotency-Key': idempotency_key });
    const checkout_url = (mpEnv('MP_SANDBOX') === '1' || mpEnv('MP_SANDBOX') === 'true')
      ? (created?.sandbox_init_point || created?.init_point || null)
      : (created?.init_point || created?.sandbox_init_point || null);

    await order.update({
      status: 'preference_created',
      mp_preference_id: created?.id || null,
      mp_raw: created || null
    });

    res.json({
      order_id: order.id,
      external_reference,
      preference_id: created?.id || null,
      checkout_url
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro ao criar pagamento do ingresso' });
  }
});

router.get('/ticketing/orders/:external_reference', async (req, res) => {
  try {
    const external_reference = String(req.params.external_reference || '').trim();
    if (!external_reference) return res.status(400).json({ error: 'Referência inválida' });
    const order = await PaymentOrder.findOne({ where: { external_reference, product_type: 'event_ticket' } });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    const meta = getOrderMetadata(order);
    const event = meta?.event_id ? await Event.findByPk(String(meta.event_id)) : null;
    const tickets = await EventTicket.findAll({ where: { order_id: order.id } });

    res.json({
      order: {
        id: order.id,
        external_reference: order.external_reference,
        status: order.status,
        amount_cents: order.amount_cents,
        currency: order.currency,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        access_granted_at: order.access_granted_at,
        event_slug: meta?.event_slug || null,
        event_title: meta?.event_title || null
      },
      event: event ? serializeEventForPublic(event, await getInventoryForEvent(event, { PaymentOrder, EventTicket })) : null,
      tickets: tickets.map((ticket) => serializeTicketInvite(ticket, event))
    });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/ticketing/invites/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Convite inválido' });
    const ticket = await EventTicket.findOne({
      where: {
        [Op.or]: [
          { qr_token: token },
          { invite_code: token }
        ]
      }
    });
    if (!ticket) return res.status(404).json({ error: 'Convite não encontrado' });
    const event = await Event.findByPk(ticket.event_id);
    res.json(serializeTicketInvite(ticket, event));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/ticketing/check-in/:token', auth, async (req, res) => {
  try {
    if (!requireProducer(req, res)) return;
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token inválido' });
    const ticket = await EventTicket.findOne({
      where: {
        [Op.or]: [
          { qr_token: token },
          { invite_code: token }
        ]
      }
    });
    if (!ticket) return res.status(404).json({ error: 'Ingresso não encontrado' });

    const event = await Event.findByPk(ticket.event_id);
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    if (String(event.created_by || '') !== String(req.user.id || '')) {
      return res.status(403).json({ error: 'Sem permissão para validar este evento' });
    }

    if (ticket.checked_in_at) {
      return res.json({
        ok: true,
        result: 'already_checked_in',
        ticket: serializeTicketInvite(ticket, event)
      });
    }

    ticket.checked_in_at = new Date();
    ticket.checked_in_by = req.user.id;
    ticket.status = 'checked_in';
    await ticket.save();

    res.json({
      ok: true,
      result: 'checked_in',
      ticket: serializeTicketInvite(ticket, event)
    });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
