const express = require('express');
const { Profile, sequelize, PaymentOrder } = require('../models');
const { emitEvent } = require('../realtime');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const { memory, scheduleSave } = require('../memoryStore');
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');
const { transporter } = require('../services/mailer');
const { createNotification } = require('../services/notifications');

const router = express.Router();

function getClientIp(req) {
  const xf = req?.headers?.['x-forwarded-for'];
  const first = typeof xf === 'string' ? xf.split(',')[0] : (Array.isArray(xf) ? xf[0] : null);
  const raw = first || req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || '';
  return String(raw || '').trim().replace(/^::ffff:/, '') || 'unknown';
}

function countVotesByIp(votesByIp) {
  const src = votesByIp && typeof votesByIp === 'object' ? votesByIp : {};
  const counts = {};
  for (const entryId of Object.values(src)) {
    const id = String(entryId || '').trim();
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

function ensureHitWinnerIfEnded(hit) {
  if (!hit || typeof hit !== 'object') return null;
  const endsMs = hit.ends_at ? new Date(String(hit.ends_at)).getTime() : null;
  if (!Number.isFinite(endsMs) || !endsMs) return null;
  if (Date.now() <= endsMs) return null;

  const entries = (Array.isArray(hit.entries) ? hit.entries : [])
    .filter((e) => e && String(e.status || 'pending').toLowerCase() === 'approved' && e.paid === true);
  if (!entries.length) return null;

  if (!hit.votes_by_ip || typeof hit.votes_by_ip !== 'object') hit.votes_by_ip = {};
  const counts = countVotesByIp(hit.votes_by_ip);

  let winner = null;
  for (const e of entries) {
    const id = String(e.id || '').trim();
    if (!id) continue;
    const votesCount = Number(counts[id] || 0);
    const createdMs = e.created_at ? new Date(String(e.created_at)).getTime() : 0;
    if (!winner) {
      winner = { entry_id: id, votes_count: votesCount, created_ms: Number.isFinite(createdMs) ? createdMs : 0 };
      continue;
    }
    if (votesCount > winner.votes_count) {
      winner = { entry_id: id, votes_count: votesCount, created_ms: Number.isFinite(createdMs) ? createdMs : 0 };
      continue;
    }
    if (votesCount === winner.votes_count) {
      const t = Number.isFinite(createdMs) ? createdMs : 0;
      if (t && (!winner.created_ms || t < winner.created_ms)) {
        winner = { entry_id: id, votes_count: votesCount, created_ms: t };
      }
    }
  }

  if (!winner?.entry_id) return null;

  const entry = entries.find((e) => String(e?.id || '') === winner.entry_id) || null;
  const composer_id = entry?.composer_id || entry?.profile_id || null;
  const snapshot = {
    hit_id: hit.id,
    entry_id: winner.entry_id,
    title: entry?.title || null,
    url: entry?.url || null,
    cover_url: entry?.cover_url || null,
    audio_url: entry?.audio_url || null,
    composer_id,
    votes_count: winner.votes_count,
    decided_at: new Date().toISOString()
  };

  const shouldUpdateHit = String(hit.winner_entry_id || '') !== String(winner.entry_id || '');
  const prev = memory.hit_winner && typeof memory.hit_winner === 'object' ? memory.hit_winner : null;
  const shouldUpdateWinner =
    !prev ||
    String(prev?.entry_id || '') !== String(snapshot.entry_id || '') ||
    String(prev?.hit_id || '') !== String(snapshot.hit_id || '') ||
    Number(prev?.votes_count || 0) !== Number(snapshot.votes_count || 0);

  if (shouldUpdateHit) hit.winner_entry_id = winner.entry_id;
  if (shouldUpdateWinner) memory.hit_winner = snapshot;

  if (shouldUpdateHit || shouldUpdateWinner) {
    hit.updated_at = new Date().toISOString();
    scheduleSave();
    emitEvent('hit_of_week.winner.updated', { winner_entry_id: hit.winner_entry_id }, 'public:hit_of_week');
  }

  return snapshot;
}

function mpEnv(k, fallback = '') {
  const v = process.env[k];
  if (v == null) return fallback;
  return String(v).trim();
}

function mpRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const token = mpEnv('MP_ACCESS_TOKEN') || mpEnv('ACCESS_TOKEN');
    if (!token) {
      const e = new Error('MP_ACCESS_TOKEN não configurado');
      e.status = 500;
      reject(e);
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
      res.on('data', (d) => chunks.push(d));
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

function parseMPHeaderKV(headerValue) {
  const s = String(headerValue || '');
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  const out = {};
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function getMPWebhookDataId(req) {
  const q = req.query || {};
  const fromQuery = q['data.id'] || q['data_id'] || q['id'] || null;
  const fromBody =
    req.body?.data?.id ||
    req.body?.data_id ||
    req.body?.id ||
    req.body?.resource ||
    null;
  const raw = fromQuery || fromBody;
  if (!raw) return '';
  return String(raw).trim();
}

function verifyMPWebhookSignature(req) {
  const secret = mpEnv('MP_WEBHOOK_SECRET') || mpEnv('MERCADO_PAGO_WEBHOOK_SECRET');
  if (!secret) return false;

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  const dataId = getMPWebhookDataId(req);
  if (!xSignature || !xRequestId || !dataId) return false;

  const parsed = parseMPHeaderKV(xSignature);
  const ts = parsed.ts;
  const v1 = parsed.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${String(xRequestId).trim()};ts:${String(ts).trim()};`;
  const calc = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return calc.toLowerCase() === String(v1).trim().toLowerCase();
}

function normalizeUserType(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'artist' || s === 'artista') return 'artist';
  if (s === 'composer' || s === 'compositor') return 'composer';
  return 'artist';
}

function avulsoPriceCents(quantity, userType) {
  const q = Number(quantity || 0);
  const n = Number.isFinite(q) ? Math.floor(q) : 0;
  if (n <= 0) return 0;
  if (userType === 'composer') {
    if (n === 1) return 2500;
    return 2500 + (n - 1) * 1000;
  }
  if (n === 1) return 10000;
  return 10000 + (n - 1) * 5000;
}

function planPriceCents(planKey, userType) {
  const k = String(planKey || '').toLowerCase().trim();
  if (k === 'mensal') return 10000;
  if (k === 'anual') return 60000;
  if (k === 'avulso') return avulsoPriceCents(1, userType);
  return 0;
}

function planLabel(planKey) {
  const k = String(planKey || '').toLowerCase().trim();
  if (k === 'mensal') return 'Mensal';
  if (k === 'anual') return 'Anual';
  if (k === 'vitalicio' || k === 'vitalício' || k === 'lifetime') return 'Vitalício';
  if (k === 'avulso') return 'Avulso';
  return 'Sem Plano';
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

function canonicalizeHashtag(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!s.startsWith('#')) s = `#${s}`;
  s = `#${s.slice(1).replace(/\s+/g, '')}`;
  s = `#${s.slice(1).replace(/[^\p{L}\p{N}_]/gu, '')}`;
  if (s.length < 2) return null;
  return s;
}

function hashtagKey(canonical) {
  const s = String(canonical || '').trim();
  if (!s || !s.startsWith('#')) return '';
  const body = s
    .slice(1)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  if (!body) return '';
  return `#${body}`;
}

function upsertGlobalHashtag(raw) {
  const tag = canonicalizeHashtag(raw);
  if (!tag) return null;
  if (!Array.isArray(memory.hashtags)) memory.hashtags = [];
  const key = hashtagKey(tag);
  if (!key) return null;
  const exists = memory.hashtags.some((t) => hashtagKey(t) === key);
  if (exists) return tag;
  memory.hashtags.unshift(tag);
  scheduleSave();
  return tag;
}

function parseHashtags(input) {
  const arr = Array.isArray(input) ? input : (typeof input === 'string' ? input.split(',') : []);
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    const tag = canonicalizeHashtag(raw);
    if (!tag) continue;
    const key = hashtagKey(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

router.get('/hashtags', async (req, res) => {
  const list = Array.isArray(memory.hashtags) ? memory.hashtags : [];
  res.json(list);
});

router.post('/hashtags', auth, async (req, res) => {
  try {
    const tag = upsertGlobalHashtag(req.body?.tag || req.body?.hashtag || req.body?.name);
    if (!tag) return res.status(400).json({ error: 'Hashtag inválida' });
    res.json({ tag });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/home', async (req, res) => {
  try {
    const nowMs = Date.now();
    const featuredWeight = (lvl) => {
      const x = String(lvl || '').toLowerCase();
      if (x === 'top') return 3;
      if (x === 'pro') return 2;
      if (x === 'basic') return 1;
      return 0;
    };
    const isFeaturedActive = (row) => {
      const ac = row?.access_control || {};
      const f = ac?.featured && typeof ac.featured === 'object' ? ac.featured : null;
      if (!f) return false;
      if (f.enabled === false) return false;
      const endsAt = f.ends_at || f.until || f.end_at || null;
      if (!endsAt) return true;
      const t = new Date(endsAt).getTime();
      return Number.isFinite(t) ? t > nowMs : false;
    };
    const isVisibleOnHome = (row) => {
      const ac = row?.access_control || {};
      return ac?.show_on_home !== false;
    };
    const sortWithFeaturedFirst = (items) => {
      const arr = Array.isArray(items) ? items.slice() : [];
      return arr.sort((a, b) => {
        const fa = isFeaturedActive(a);
        const fb = isFeaturedActive(b);
        if (fa !== fb) return fa ? -1 : 1;
        if (fa && fb) {
          const wa = featuredWeight(a?.access_control?.featured?.level);
          const wb = featuredWeight(b?.access_control?.featured?.level);
          if (wa !== wb) return wb - wa;
          const pa = a?.access_control?.featured?.pinned === true;
          const pb = b?.access_control?.featured?.pinned === true;
          if (pa !== pb) return pb ? 1 : -1;
          const ea = new Date(a?.access_control?.featured?.ends_at || a?.access_control?.featured?.until || 0).getTime();
          const eb = new Date(b?.access_control?.featured?.ends_at || b?.access_control?.featured?.until || 0).getTime();
          if (Number.isFinite(ea) && Number.isFinite(eb) && ea !== eb) return eb - ea;
        }
        const ca = new Date(a?.createdAt || a?.created_at || 0).getTime();
        const cb = new Date(b?.createdAt || b?.created_at || 0).getTime();
        return cb - ca;
      });
    };
    const takeDistinctById = (items, limit) => {
      const out = [];
      const seen = new Set();
      for (const it of items || []) {
        const id = String(it?.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(it);
        if (out.length >= limit) break;
      }
      return out;
    };

    const featuredPlans = memory.featured_plans && typeof memory.featured_plans === 'object' ? memory.featured_plans : null;

    const producersRaw = await Profile.findAll({ where: { cargo: 'Produtor' } });
    const sellersRaw = await Profile.findAll({ where: { cargo: 'Vendedor' } });
    const artistsRaw = await Profile.findAll({ where: { cargo: 'Artista' } });
    const composersRaw = await Profile.findAll({ where: { cargo: 'Compositor' } });

    const expireFeaturedIfNeeded = async (rows) => {
      const list = Array.isArray(rows) ? rows : [];
      const updates = [];
      for (const row of list) {
        const id = String(row?.id || '').trim();
        if (!id) continue;
        const ac = row?.access_control && typeof row.access_control === 'object' ? { ...row.access_control } : {};
        const f = ac?.featured && typeof ac.featured === 'object' ? { ...ac.featured } : null;
        if (!f || f.enabled === false) continue;
        const originalEndsAt = f.ends_at || f.until || f.end_at || f.endsAt || null;
        let endsAt = originalEndsAt;

        if (!endsAt) {
          const lvl = String(f.level || '').toLowerCase().trim();
          const dh = Number(featuredPlans?.plans?.[lvl]?.duration_hours);
          const startsTs = f.starts_at ? new Date(String(f.starts_at)).getTime() : null;
          if (Number.isFinite(dh) && dh > 0 && Number.isFinite(startsTs) && startsTs) {
            endsAt = new Date(startsTs + dh * 60 * 60 * 1000).toISOString();
          }
        }

        if (!endsAt) continue;
        const t = new Date(String(endsAt)).getTime();
        if (!Number.isFinite(t)) continue;

        if (t > nowMs) {
          if (!originalEndsAt) {
            ac.featured = { ...f, ends_at: endsAt };
            if (typeof row?.setDataValue === 'function') row.setDataValue('access_control', ac);
            else row.access_control = ac;
            updates.push({ id, ac });
          }
          continue;
        }

        ac.featured = { enabled: false, level: null, starts_at: f.starts_at || null, ends_at: String(endsAt), pinned: false };
        if (typeof row?.setDataValue === 'function') row.setDataValue('access_control', ac);
        else row.access_control = ac;
        updates.push({ id, ac });
      }
      if (updates.length === 0) return;
      await Promise.all(updates.map((u) => Profile.update({ access_control: u.ac }, { where: { id: u.id } }).catch(() => null)));
    };

    await expireFeaturedIfNeeded(producersRaw);
    await expireFeaturedIfNeeded(sellersRaw);
    await expireFeaturedIfNeeded(artistsRaw);
    await expireFeaturedIfNeeded(composersRaw);

    const addDerived = (row) => {
      const ac = row?.access_control || {};
      return { ...row.toJSON?.() ? row.toJSON() : row, verified: ac?.verified === true };
    };
    const producers = takeDistinctById(sortWithFeaturedFirst(producersRaw.map(addDerived).filter(isVisibleOnHome)), 30);
    const sellers = takeDistinctById(sortWithFeaturedFirst(sellersRaw.map(addDerived).filter(isVisibleOnHome)), 30);
    const artists = takeDistinctById(sortWithFeaturedFirst(artistsRaw.map(addDerived).filter(isVisibleOnHome)), 30);
    const composers = takeDistinctById(sortWithFeaturedFirst(composersRaw.map(addDerived).filter(isVisibleOnHome)), 30);
    const compositionsApprovedRaw = memory.compositions.filter(c => String(c.status).toLowerCase() === 'approved').map(c => {
      const arr = Array.isArray(memory.likes[c.id]) ? memory.likes[c.id] : [];
      return { ...c, likes_count: arr.length };
    });
    const compProfileIds = Array.from(
      new Set(
        compositionsApprovedRaw
          .flatMap((c) => [c?.composer_id, c?.composer_partner_id])
          .filter(Boolean)
          .map(String)
      )
    );
    let compProfilesById = new Map();
    try {
      if (compProfileIds.length) {
        const rows = await Profile.findAll({ where: { id: compProfileIds } });
        compProfilesById = new Map((rows || []).map((r) => [String(r.id), r]));
      }
    } catch {
      compProfilesById = new Map();
    }
    const compositionsApproved = compositionsApprovedRaw.map((c) => {
      const p1 = c?.composer_id ? compProfilesById.get(String(c.composer_id)) : null;
      const p2 = c?.composer_partner_id ? compProfilesById.get(String(c.composer_partner_id)) : null;
      const composer_name = c?.composer_name || c?.author_name || c?.nome_autor || c?.nome_compositor || p1?.nome || p1?.nome_completo_razao_social || null;
      const composer_partner_name = c?.composer_partner_name || p2?.nome || p2?.nome_completo_razao_social || null;
      return { ...c, composer_name, composer_partner_name };
    });
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    ensureHitWinnerIfEnded(hit);
    const publicHit = hit ? {
      id: hit.id,
      theme: hit.theme,
      theme_ideas: Array.isArray(hit.theme_ideas) ? hit.theme_ideas : [],
      home_subtitle: hit.home_subtitle || null,
      home_helper_text: hit.home_helper_text || null,
      starts_at: hit.starts_at || null,
      ends_at: hit.ends_at || null,
      entry_fee: Number(hit.entry_fee) || 10,
      entries_count: Array.isArray(hit.entries) ? hit.entries.length : 0,
      winner_entry_id: hit.winner_entry_id || null,
      updated_at: hit.updated_at || null
    } : null;
    const hitWinner = memory.hit_winner && typeof memory.hit_winner === 'object' ? memory.hit_winner : null;
    let publicHitWinner = hitWinner ? { ...hitWinner } : null;
    if (publicHitWinner?.composer_id) {
      try {
        const p = await Profile.findByPk(String(publicHitWinner.composer_id));
        if (p) publicHitWinner.composer_name = p?.nome || p?.nome_completo_razao_social || null;
      } catch {
        void 0;
      }
    }
    return res.json({
      hero: { title: 'Beatwap', subtitle: 'Plataforma musical' },
      producers: producers.slice(0, 6),
      sellers: sellers.slice(0, 6),
      artists: artists.slice(0, 6),
      composers: composers.slice(0, 6),
      releases: [],
      compositions: compositionsApproved,
      projects: [],
      sponsors: [],
      hit_of_week: publicHit,
      hit_winner: publicHitWinner,
      featured_plans: featuredPlans
    });
  } catch {
    const compositionsApproved = memory.compositions.filter(c => String(c.status).toLowerCase() === 'approved').map(c => {
      const arr = Array.isArray(memory.likes[c.id]) ? memory.likes[c.id] : [];
      return { ...c, likes_count: arr.length };
    });
    return res.json({
      hero: { title: 'Beatwap', subtitle: 'Plataforma musical' },
      producers: [],
      sellers: [],
      artists: [],
      composers: [],
      releases: [],
      compositions: compositionsApproved,
      projects: [],
      sponsors: [],
      hit_of_week: null,
      hit_winner: null,
      featured_plans: null
    });
  }
});

router.get('/hit-of-week', async (req, res) => {
  try {
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.json(null);
    res.json({
      id: hit.id,
      theme: hit.theme,
      theme_ideas: Array.isArray(hit.theme_ideas) ? hit.theme_ideas : [],
      home_subtitle: hit.home_subtitle || null,
      home_helper_text: hit.home_helper_text || null,
      starts_at: hit.starts_at || null,
      ends_at: hit.ends_at || null,
      entry_fee: Number(hit.entry_fee) || 10,
      entries_count: Array.isArray(hit.entries) ? hit.entries.length : 0,
      winner_entry_id: hit.winner_entry_id || null,
      updated_at: hit.updated_at || null
    });
  } catch {
    res.json(null);
  }
});

router.get('/hit-of-week/entries', async (req, res) => {
  try {
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.json([]);
    ensureHitWinnerIfEnded(hit);
    const clientIp = getClientIp(req);
    if (!hit.votes_by_ip || typeof hit.votes_by_ip !== 'object') hit.votes_by_ip = {};
    const votesByIp = hit.votes_by_ip;
    const myVoteEntryId = votesByIp[clientIp] ? String(votesByIp[clientIp]) : null;
    const voteCounts = countVotesByIp(votesByIp);
    const comps = Array.isArray(memory.compositions) ? memory.compositions : [];
    const compsById = new Map(comps.map((c) => [String(c.id), c]));

    const visible = (Array.isArray(hit.entries) ? hit.entries : [])
      .filter((e) => e && (String(e.status || 'pending').toLowerCase() === 'approved') && e.paid === true)
      .map((e) => {
        const voted = myVoteEntryId ? myVoteEntryId === String(e.id) : false;
        const votes_count = Number(voteCounts[String(e.id)] || 0);
        const comp = e?.composition_id ? compsById.get(String(e.composition_id)) : null;
        const title = (comp?.title || e?.title || 'Música').trim();
        const cover_url = comp?.cover_url || e?.cover_url || null;
        const audio_url = comp?.audio_url || e?.audio_url || null;
        const composer_id = comp?.composer_id || e?.composer_id || e?.profile_id || null;
        return { ...e, title, cover_url, audio_url, composer_id, votes_count, voted };
      });

    const composerIds = Array.from(new Set(visible.map((e) => e.composer_id).filter(Boolean).map(String)));
    let profilesById = new Map();
    try {
      if (composerIds.length) {
        const rows = await Profile.findAll({ where: { id: composerIds } });
        profilesById = new Map((rows || []).map((r) => [String(r.id), r]));
      }
    } catch {
      profilesById = new Map();
    }

    const enriched = visible.map((e) => {
      const p = e.composer_id ? profilesById.get(String(e.composer_id)) : null;
      const composer_name = p?.nome || p?.nome_completo_razao_social || null;
      return { ...e, composer_name };
    });

    enriched.sort((a, b) => (Number(b.votes_count || 0) - Number(a.votes_count || 0)) || String(b.created_at || '').localeCompare(String(a.created_at || '')));

    res.json(enriched);
  } catch {
    res.json([]);
  }
});

router.post('/hit-of-week/entries', auth, async (req, res) => {
  try {
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.status(400).json({ error: 'Desafio indisponível' });

    if (req.user?.cargo !== 'Produtor') {
      const now = Date.now();
      const starts = hit.starts_at ? new Date(hit.starts_at).getTime() : null;
      const ends = hit.ends_at ? new Date(hit.ends_at).getTime() : null;
      if (Number.isFinite(starts) && starts && now < starts) {
        return res.status(400).json({ error: 'Desafio ainda não começou' });
      }
      if (Number.isFinite(ends) && ends && now > ends) {
        return res.status(400).json({ error: 'Desafio encerrado' });
      }
    }

    const composition_id = req.body?.composition_id ? String(req.body.composition_id).trim() : null;
    let composition = null;
    if (composition_id) {
      composition = (Array.isArray(memory.compositions) ? memory.compositions : []).find((c) => String(c?.id || '') === composition_id) || null;
      if (!composition) return res.status(404).json({ error: 'Composição não encontrada' });
      if (req.user?.cargo !== 'Produtor' && String(composition?.composer_id || '') !== String(req.user?.id || '')) {
        return res.status(403).json({ error: 'Sem permissão' });
      }
      const exists = (Array.isArray(hit.entries) ? hit.entries : []).some((e) => String(e?.composition_id || '') === composition_id && String(e?.hit_id || '') === String(hit.id));
      if (exists) return res.status(400).json({ error: 'Esta composição já está inscrita.' });
    }

    const credits = await requireHitCredits(req, 1);
    if (!credits.ok) return res.status(402).json({ error: credits.error, code: credits.code });

    const title = String(composition?.title || req.body?.title || '').trim();
    const url = String(req.body?.url || composition?.audio_url || '').trim();
    if (!title) return res.status(400).json({ error: 'Título obrigatório' });
    if (!url) return res.status(400).json({ error: 'Link obrigatório' });

    const entry = {
      id: `hit_entry_${Date.now()}`,
      hit_id: hit.id,
      profile_id: req.user?.id || null,
      profile_email: req.user?.email || null,
      composer_id: composition?.composer_id || null,
      composition_id,
      title,
      url,
      cover_url: composition?.cover_url || null,
      audio_url: composition?.audio_url || null,
      status: 'pending',
      paid: true,
      created_at: new Date().toISOString()
    };
    if (!Array.isArray(hit.entries)) hit.entries = [];
    hit.entries.unshift(entry);
    hit.updated_at = new Date().toISOString();
    scheduleSave();
    emitEvent('hit_of_week.entry.created', { entry }, 'public:hit_of_week');
    res.json({ ok: true, entry });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/hit-of-week/entries/:entryId/vote', async (req, res) => {
  try {
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.status(400).json({ error: 'Desafio indisponível' });
    const entryId = String(req.params.entryId || '').trim();
    if (!entryId) return res.status(400).json({ error: 'ID inválido' });

    ensureHitWinnerIfEnded(hit);
    const now = Date.now();
    const starts = hit.starts_at ? new Date(hit.starts_at).getTime() : null;
    const ends = hit.ends_at ? new Date(hit.ends_at).getTime() : null;
    if (Number.isFinite(starts) && starts && now < starts) {
      return res.status(400).json({ error: 'Votação ainda não começou' });
    }
    if (Number.isFinite(ends) && ends && now > ends) {
      return res.status(400).json({ error: 'Votação encerrada' });
    }

    const idx = (Array.isArray(hit.entries) ? hit.entries : []).findIndex((e) => String(e?.id || '') === entryId);
    if (idx < 0) return res.status(404).json({ error: 'Inscrição não encontrada' });
    const entry = hit.entries[idx];
    if (String(entry?.status || 'pending').toLowerCase() !== 'approved' || entry?.paid !== true) {
      return res.status(403).json({ error: 'Inscrição indisponível para votação' });
    }

    const clientIp = getClientIp(req);
    if (!hit.votes_by_ip || typeof hit.votes_by_ip !== 'object') hit.votes_by_ip = {};
    const prevVote = hit.votes_by_ip[clientIp] ? String(hit.votes_by_ip[clientIp]) : null;
    if (prevVote && prevVote !== entryId) {
      return res.status(400).json({ error: 'Este aparelho já votou nesta semana' });
    }
    if (!prevVote) hit.votes_by_ip[clientIp] = entryId;

    const counts = countVotesByIp(hit.votes_by_ip);
    const votesCount = Number(counts[entryId] || 0);
    hit.updated_at = new Date().toISOString();
    scheduleSave();
    emitEvent('hit_of_week.votes.updated', { entry_id: entryId, votes: votesCount }, 'public:hit_of_week');
    res.json({ ok: true, voted: true, votes: votesCount });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/releases', (req, res) => res.json([]));
router.get('/compositions', async (req, res) => {
  try {
    const list = (Array.isArray(memory.compositions) ? memory.compositions : [])
      .filter((c) => String(c?.status || '').toLowerCase() === 'approved')
      .map((c) => {
        const arr = Array.isArray(memory.likes?.[c.id]) ? memory.likes[c.id] : [];
        return { ...c, likes_count: arr.length };
      });

    const ids = Array.from(
      new Set(
        list
          .flatMap((c) => [c?.composer_id, c?.composer_partner_id])
          .filter(Boolean)
          .map(String)
      )
    );
    let byId = new Map();
    try {
      if (ids.length) {
        const rows = await Profile.findAll({ where: { id: ids } });
        byId = new Map((rows || []).map((r) => [String(r.id), r]));
      }
    } catch {
      byId = new Map();
    }

    const enriched = list.map((c) => {
      const p1 = c?.composer_id ? byId.get(String(c.composer_id)) : null;
      const p2 = c?.composer_partner_id ? byId.get(String(c.composer_partner_id)) : null;
      return {
        ...c,
        composer_name: c?.composer_name || p1?.nome || p1?.nome_completo_razao_social || null,
        composer_partner_name: c?.composer_partner_name || p2?.nome || p2?.nome_completo_razao_social || null,
      };
    });

    res.json(enriched);
  } catch {
    res.json([]);
  }
});
router.get('/projects', (req, res) => res.json([]));
router.get('/sponsors', (req, res) => {
  try {
    const list = Array.isArray(memory.sponsors) ? memory.sponsors : [];
    const activeOnly = list.filter(s => s && s.active !== false);
    const payload = activeOnly.map(s => ({
      id: s.id,
      name: s.name,
      instagram_url: s.instagram_url || null,
      site_url: s.site_url || null,
      logo_url: s.logo_url || null,
      active: s.active !== false
    }));
    res.json(payload);
  } catch {
    res.json([]);
  }
});
router.get('/composers', async (req, res) => {
  try {
    const composers = await Profile.findAll({ where: { cargo: 'Compositor' } });
    const compIds = Array.from(
      new Set(
        (Array.isArray(memory.compositions) ? memory.compositions : [])
          .flatMap((c) => [c?.composer_id, c?.composer_partner_id])
          .filter(Boolean)
          .map(String)
      )
    ).slice(0, 500);

    let artistsWithCompositions = [];
    if (compIds.length) {
      try {
        artistsWithCompositions = await Profile.findAll({ where: { cargo: 'Artista', id: compIds } });
      } catch {
        artistsWithCompositions = [];
      }
    }

    const merged = new Map();
    (Array.isArray(composers) ? composers : []).forEach((p) => merged.set(String(p?.id || ''), p));
    (Array.isArray(artistsWithCompositions) ? artistsWithCompositions : []).forEach((p) => merged.set(String(p?.id || ''), p));
    res.json(Array.from(merged.values()).filter((p) => p && p.id));
  } catch {
    res.json([]);
  }
});
router.get('/producers', async (req, res) => {
  try {
    const producers = await Profile.findAll({ where: { cargo: 'Produtor' } });
    res.json(producers);
  } catch {
    res.json([]);
  }
});
router.get('/profiles', async (req, res) => {
  try {
    const role = String(req.query.role || '').trim();
    const map = { artist: 'Artista', seller: 'Vendedor', composer: 'Compositor', producer: 'Produtor' };
    if (!role) {
      const raws = await Profile.findAll({ where: { cargo: ['Artista','Produtor','Compositor','Vendedor'] } });
      const list = raws.map(r => {
        const ac = r?.access_control || {};
        return { ...r.toJSON?.() ? r.toJSON() : r, verified: ac?.verified === true };
      });
      return res.json(list);
    }
    const cargo = map[role] || role;
    const raws = await Profile.findAll({ where: { cargo } });
    const list = raws.map(r => {
      const ac = r?.access_control || {};
      return { ...r.toJSON?.() ? r.toJSON() : r, verified: ac?.verified === true };
    });
    res.json(list);
  } catch {
    res.json([]);
  }
});
router.get('/users', async (req, res) => {
  try {
    const raws = await Profile.findAll({ where: { cargo: ['Artista','Produtor','Compositor','Vendedor'] } });
    const list = raws.map(r => {
      const ac = r?.access_control || {};
      return { ...r.toJSON?.() ? r.toJSON() : r, verified: ac?.verified === true };
    });
    res.json(list);
  } catch {
    res.json([]);
  }
});
router.get('/profiles/artists/all', async (req, res) => {
  try {
    const list = await Profile.findAll({ where: { cargo: 'Artista' } });
    res.json(list);
  } catch {
    res.json([]);
  }
});

// Alias used by Admin pages
router.get('/artists', async (req, res) => {
  try {
    const list = await Profile.findAll({ where: { cargo: 'Artista' } });
    res.json(list);
  } catch {
    res.json([]);
  }
});

// Public profile by id
router.get('/profiles/:id', async (req, res) => {
  try {
    const user = await Profile.findByPk(req.params.id);
    if (!user) {
      const ownerId = String(req.params.id);
      const hasProducerWork = memory.compositions.some(c => String(c.producer_id) === ownerId);
      const hasComposerWork = memory.compositions.some(c => String(c.composer_id) === ownerId);
      const cargo = hasProducerWork ? 'Produtor' : (hasComposerWork ? 'Compositor' : 'Compositor');
      const mock = {
        id: ownerId,
        cargo,
        nome: 'Perfil Público',
        bio: null,
        avatar_url: null,
        genero_musical: null,
        instagram_url: null,
        youtube_url: null,
        tiktok_url: null,
        deezer_url: null,
        spotify_url: null,
        site_url: null,
        access_control: { verified: false }
      };
      return res.json(mock);
    }
    res.json(user);
  } catch (e) {
    try {
      const ownerId = String(req.params.id);
      const hasProducerWork = memory.compositions.some(c => String(c.producer_id) === ownerId);
      const hasComposerWork = memory.compositions.some(c => String(c.composer_id) === ownerId);
      const cargo = hasProducerWork ? 'Produtor' : (hasComposerWork ? 'Compositor' : 'Compositor');
      const mock = {
        id: ownerId,
        cargo,
        nome: 'Perfil Público',
        bio: null,
        avatar_url: null,
        genero_musical: null,
        instagram_url: null,
        youtube_url: null,
        tiktok_url: null,
        deezer_url: null,
        spotify_url: null,
        site_url: null,
        access_control: { verified: false }
      };
      return res.json(mock);
    } catch {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }
});

router.put('/profiles/:id', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    const allowed = ['plano', 'bonus_quota', 'plan_started_at'];
    const patch = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        patch[k] = req.body[k];
      }
    }
    if (Object.keys(patch).length === 0) {
      const current = await Profile.findByPk(id);
      return res.json(current || {});
    }
    await Profile.update(patch, { where: { id } });
    const updated = await Profile.findByPk(id);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Gallery posts for a profile (mock empty list)
router.get('/profiles/:id/posts', async (req, res) => {
  try {
    const ownerId = String(req.params.id);
    const format = String(req.query.format || '').trim();
    const baseList = memory.posts
      .filter(p => String(p.user_id) === ownerId)
      .filter(p => String(p?.scope || 'public').toLowerCase().trim() !== 'feed')
      .map(p => {
        if ((!p.media_url || p.media_url === '') && p.link_url) {
          try {
            const safe = String(p.link_url || '').replace(/[`"'<>]/g, '').trim();
            const m = safe.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/i);
            const vid = m && m[2] && m[2].length === 11 ? m[2] : null;
            if (vid) return { ...p, media_url: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`, media_type: 'link' };
          } catch {}
        }
        if ((!p.media_url || p.media_url === '') && String(p.media_type || '').toLowerCase() === 'image') {
          const placeholder = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2236%22 font-family=%22Arial%22>Imagem indisponível</text></svg>';
          return { ...p, media_url: placeholder, media_type: 'image' };
        }
        return p;
      });
    const list = baseList
      .map(p => {
        const arr = Array.isArray(memory.likes[p.id]) ? memory.likes[p.id] : [];
        return { ...p, likes_count: arr.length };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (format === 'grouped') {
      const grouped = { video: [], image: [], link: [] };
      for (const p of list) {
        const t = String(p.media_type || '').toLowerCase();
        if (t === 'video') grouped.video.push(p);
        else if (t === 'link') grouped.link.push(p);
        else grouped.image.push(p);
      }
      console.log('GET /profiles/:id/posts grouped', ownerId, { counts: { video: grouped.video.length, image: grouped.image.length, link: grouped.link.length } });
      return res.json(grouped);
    }
    console.log('GET /profiles/:id/posts list', ownerId, { count: list.length });
    res.json(list);
  } catch {
    res.json([]);
  }
});

router.get('/profiles/:id/compositions', async (req, res) => {
  const ownerId = req.params.id;
  const list = memory.compositions
    .filter(c =>
      (String(c.composer_id) === String(ownerId)) ||
      (String(c.producer_id) === String(ownerId)) ||
      (String(c.composer_partner_id || '') === String(ownerId))
    )
    .filter(c => String(c.status).toLowerCase() === 'approved')
    .map(c => {
      const arr = Array.isArray(memory.likes[c.id]) ? memory.likes[c.id] : [];
      return { ...c, likes_count: arr.length };
    });
  res.json(list);
});

// Composer's own compositions
router.get('/composer/compositions', async (req, res) => {
  try {
    let composerId = null;
    try {
      const h = String(req.headers.authorization || '');
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        composerId = payload?.sub || null;
      }
    } catch {
      composerId = null;
    }
    if (!composerId) return res.json([]);
    const list = memory.compositions
      .filter(c => (String(c.composer_id) === String(composerId)) || (String(c.composer_partner_id || '') === String(composerId)))
      .map(c => {
        const arr = Array.isArray(memory.likes[c.id]) ? memory.likes[c.id] : [];
        return { ...c, likes_count: arr.length };
      });
    res.json(list);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Create a composition (mock)
async function requireUploadCredits(req, needed) {
  if (req.user?.cargo === 'Produtor') return { ok: true };
  const n = Number(needed || 0);
  if (!Number.isFinite(n) || n <= 0) return { ok: true };
  const user = await Profile.findByPk(req.user?.id);
  if (!user) return { ok: false, error: 'Usuário não encontrado', code: 'USER_NOT_FOUND' };
  const plan = String(user?.plano || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (plan.includes('vitalicio') || plan.includes('lifetime')) return { ok: true };
  const credits = Number(user?.creditos_envio || 0);
  if (credits < n) return { ok: false, error: 'Créditos insuficientes para envio', code: 'NO_CREDITS' };
  user.creditos_envio = credits - n;
  await user.save();
  return { ok: true };
}

async function requireHitCredits(req, needed) {
  if (req.user?.cargo === 'Produtor') return { ok: true };
  const n = Number(needed || 0);
  if (!Number.isFinite(n) || n <= 0) return { ok: true };
  const user = await Profile.findByPk(req.user?.id);
  if (!user) return { ok: false, error: 'Usuário não encontrado', code: 'USER_NOT_FOUND' };
  const plan = String(user?.plano || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (plan.includes('vitalicio') || plan.includes('lifetime')) return { ok: true };
  const credits = Number(user?.creditos_hit_semana || 0);
  if (credits < n) return { ok: false, error: 'Créditos de Hit da Semana insuficientes', code: 'NO_HIT_CREDITS' };
  user.creditos_hit_semana = credits - n;
  await user.save();
  return { ok: true };
}

router.post('/compositions', auth, async (req, res) => {
  try {
    if (req.user?.cargo !== 'Compositor' && req.user?.cargo !== 'Produtor') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const credits = await requireUploadCredits(req, 1);
    if (!credits.ok) return res.status(402).json({ error: credits.error, code: credits.code });

    const id = `comp_${Date.now()}`;
    const producer_id = req.user?.cargo === 'Produtor' ? (req.user?.id || null) : null;
    const composer_id = req.user?.cargo === 'Compositor'
      ? (req.user?.id || null)
      : (req.body?.composer_id || null);

    if (!composer_id) return res.status(400).json({ error: 'composer_id obrigatório' });

    const chorusStartRaw = req.body?.chorus_start_seconds;
    const chorusEndRaw = req.body?.chorus_end_seconds;
    const chorus_start_seconds = Number.isFinite(Number(chorusStartRaw)) ? Number(chorusStartRaw) : null;
    const chorus_end_seconds = Number.isFinite(Number(chorusEndRaw)) ? Number(chorusEndRaw) : null;
    const hashtags = parseHashtags(req.body?.hashtags || req.body?.tags || []);
    for (const t of hashtags) upsertGlobalHashtag(t);

    const is_beatwap_composer_partner = req.body?.is_beatwap_composer_partner === true || String(req.body?.is_beatwap_composer_partner || '').toLowerCase() === 'true';
    const composer_partner_id_raw = req.body?.composer_partner_id ? String(req.body.composer_partner_id).trim() : '';
    const composer_partner_id = is_beatwap_composer_partner && composer_partner_id_raw ? composer_partner_id_raw : null;
    if (composer_partner_id && String(composer_partner_id) === String(composer_id)) {
      return res.status(400).json({ error: 'Compositor parceiro inválido' });
    }

    const external_composers_in = Array.isArray(req.body?.external_composers)
      ? req.body.external_composers
      : (Array.isArray(req.body?.external_composer_names) ? req.body.external_composer_names : []);
    const external_composers = (external_composers_in || [])
      .map((x) => String(x || '').trim())
      .filter((x) => x)
      .slice(0, 20);

    const lyricsRaw = req.body?.lyrics ?? req.body?.letra ?? null;
    const lyricsClean = String(lyricsRaw || '').trim();
    const lyrics = lyricsClean ? lyricsClean.slice(0, 20000) : null;

    const item = {
      id,
      composer_id,
      producer_id,
      title: req.body?.title || 'Sem título',
      genre: req.body?.genre || null,
      description: req.body?.description || null,
      lyrics,
      price: req.body?.price ?? null,
      cover_url: req.body?.cover_url || null,
      audio_url: req.body?.audio_url || null,
      chorus_start_seconds,
      chorus_end_seconds,
      hashtags,
      is_beatwap_composer_partner,
      composer_partner_id,
      external_composers,
      status: req.body?.status || 'pending',
      created_at: new Date().toISOString()
    };
    memory.compositions.unshift(item);
    scheduleSave();
    if (item.composer_id) emitEvent('compositions.created', item, `profile:${item.composer_id}`);
    if (item.producer_id) emitEvent('compositions.created', item, `profile:${item.producer_id}`);
    if (item.composer_partner_id) emitEvent('compositions.created', item, `profile:${item.composer_partner_id}`);
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Admin compositions listing (reads same in-memory)
router.get('/admin/compositions', async (req, res) => {
  res.json(memory.compositions);
});
// Update composition status
router.put('/admin/compositions/:id/status', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const id = req.params.id;
    const status = String(req.body?.status || '').trim();
    const feedback = req.body?.feedback || null;
    const allowed = ['approved','rejected','pending'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const idx = memory.compositions.findIndex(c => c.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Composição não encontrada' });
    const previous = memory.compositions[idx] || {};
    memory.compositions[idx] = { ...previous, status, feedback };
    scheduleSave();
    const updated = memory.compositions[idx];
    const prevStatus = String(previous?.status || '').toLowerCase().trim();
    const nextStatus = String(updated?.status || '').toLowerCase().trim();
    const changedStatus = prevStatus !== nextStatus;

    if (updated?.composer_id && changedStatus) {
      if (nextStatus === 'approved') {
        createNotification({
          recipient_id: updated.composer_id,
          type: 'success',
          title: 'Composição aprovada',
          message: `Sua composição "${updated?.title || 'Sem título'}" foi aprovada.`,
          link: '/dashboard/composicoes'
        });
      } else if (nextStatus === 'rejected') {
        const reason = String(feedback || '').trim();
        createNotification({
          recipient_id: updated.composer_id,
          type: 'error',
          title: 'Composição reprovada',
          message: reason
            ? `Sua composição "${updated?.title || 'Sem título'}" foi reprovada. Motivo: ${reason}`
            : `Sua composição "${updated?.title || 'Sem título'}" foi reprovada.`,
          link: '/dashboard/composicoes'
        });
      }
    }

    if (updated?.composer_partner_id && changedStatus) {
      if (nextStatus === 'approved') {
        createNotification({
          recipient_id: updated.composer_partner_id,
          type: 'success',
          title: 'Composição aprovada',
          message: `Uma composição vinculada a você ("${updated?.title || 'Sem título'}") foi aprovada.`,
          link: '/dashboard/composicoes'
        });
      } else if (nextStatus === 'rejected') {
        const reason = String(feedback || '').trim();
        createNotification({
          recipient_id: updated.composer_partner_id,
          type: 'error',
          title: 'Composição reprovada',
          message: reason
            ? `Uma composição vinculada a você ("${updated?.title || 'Sem título'}") foi reprovada. Motivo: ${reason}`
            : `Uma composição vinculada a você ("${updated?.title || 'Sem título'}") foi reprovada.`,
          link: '/dashboard/composicoes'
        });
      }
    }

    if (updated?.composer_id) emitEvent('compositions.updated', { id, item: updated }, `profile:${updated.composer_id}`);
    if (updated?.producer_id) emitEvent('compositions.updated', { id, item: updated }, `profile:${updated.producer_id}`);
    if (updated?.composer_partner_id) emitEvent('compositions.updated', { id, item: updated }, `profile:${updated.composer_partner_id}`);
    res.json({ ok: true, item: memory.compositions[idx] });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Delete composition
router.delete('/admin/compositions/:id', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const id = req.params.id;
    const idx = memory.compositions.findIndex(c => c.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Composição não encontrada' });
    
    const deletedComposition = memory.compositions.splice(idx, 1)[0];
    scheduleSave();
    emitEvent('compositions.deleted', { id, item: deletedComposition }, `composition:${id}`);
    res.json({ ok: true, message: 'Composição apagada com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Analytics events (tracking)
router.post('/analytics', async (req, res) => {
  try {
    const crypto = require('crypto');
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const type = String(body?.type || '').trim();
    if (!type) return res.status(400).json({ ok: false, error: 'Tipo inválido' });

    const incomingPayload =
      body?.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? body.payload
        : null;

    const payload = incomingPayload
      ? { ...incomingPayload }
      : (() => {
          const p = { ...body };
          delete p.type;
          delete p.payload;
          delete p.ip_hash;
          return p;
        })();

    const getClientIp = () => {
      const xff = String(req.headers['x-forwarded-for'] || '').trim();
      if (xff) return xff.split(',')[0].trim();
      return String(req.ip || '').trim();
    };

    const salt = String(process.env.ANALYTICS_SALT || process.env.JWT_SECRET || 'devsecret');
    const ua = String(req.headers['user-agent'] || '');
    const derivedIpHash = crypto
      .createHash('sha256')
      .update(`${getClientIp()}|${ua}|${salt}`)
      .digest('hex')
      .slice(0, 32);

    const ip_hash = String(body?.ip_hash || payload?.ip_hash || derivedIpHash || 'unknown');
    const artist_id = payload?.artist_id || payload?.profile_id || payload?.artista_id || null;
    const music_id = payload?.music_id || payload?.id || payload?.track_id || null;
    const duration_seconds = Number(payload?.duration_seconds || 0) || 0;

    if (type === 'page_view') {
      const path = String(payload?.path || payload?.pathname || '').trim();
      const page = String(payload?.page || '').trim();
      const isHome = path === '/' || page === 'home';
      if (isHome) {
        if (!memory.home_visits || typeof memory.home_visits !== 'object' || Array.isArray(memory.home_visits)) {
          memory.home_visits = {};
        }
        const nowIso = new Date().toISOString();
        const nowMs = Date.now();
        const current = memory.home_visits[ip_hash] && typeof memory.home_visits[ip_hash] === 'object'
          ? memory.home_visits[ip_hash]
          : {};
        const firstSeenAt = current.first_seen_at || nowIso;
        const lastCountedAt = current.last_counted_at || null;
        const lastMs = lastCountedAt ? new Date(String(lastCountedAt)).getTime() : null;
        const canCountAgain = !Number.isFinite(lastMs) || (nowMs - lastMs) >= (24 * 60 * 60 * 1000);
        const visitsCount = Number(current.visits_count || 0);

        memory.home_visits[ip_hash] = {
          ip_hash,
          first_seen_at: firstSeenAt,
          last_seen_at: nowIso,
          last_counted_at: canCountAgain ? nowIso : (current.last_counted_at || nowIso),
          visits_count: canCountAgain ? (visitsCount + 1) : visitsCount
        };
      }
    }

    if (!Array.isArray(memory.analytics)) memory.analytics = [];
    memory.analytics.push({
      id: `ev_${Date.now()}`,
      type,
      payload,
      ip_hash,
      artist_id,
      music_id,
      duration_seconds,
      created_at: new Date().toISOString()
    });
    scheduleSave();
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});
// Finance events listing (used by ShowRevenueDistributor)
router.get('/events', async (req, res) => {
  res.json(memory.events);
});

// Get single event by id
router.get('/events/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const item = (memory.events || []).find(e => e.id === id);
    if (!item) return res.status(404).json({ error: 'Evento não encontrado' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Create a public show event for the logged artist
router.post('/events', auth, async (req, res) => {
  try {
    const id = `evt_${Date.now()}`;
    const artista_id = req.user?.id || null;
    const event_date = req.body?.event_date || new Date().toISOString();
    const location = req.body?.location || '';
    const flyer_url = req.body?.flyer_url || null;
    const ticket_price = req.body?.ticket_price || null;
    const purchase_contact = req.body?.purchase_contact || null;
    const description = req.body?.description || null;
    const cents = Number.isFinite(Number(ticket_price)) ? Math.round(Number(ticket_price) * 100) : null;
    const item = {
      id,
      artista_id,
      event_date,
      location,
      flyer_url,
      ticket_price_cents: cents,
      purchase_contact,
      description,
      created_at: new Date().toISOString()
    };
    memory.events.unshift(item);
    scheduleSave();
    emitEvent('events.created', item, `profile:${artista_id}`);
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Delete a public show event
router.delete('/events/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const list = (memory.events || []);
    const idx = list.findIndex(e => e.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Evento não encontrado' });
    const item = list[idx];
    const isProducer = String(req.user?.cargo || '') === 'Produtor';
    const isOwner = String(item?.artista_id || '') === String(req.user?.id || '');
    if (!isProducer && !isOwner) return res.status(403).json({ error: 'Sem permissão' });
    const removed = memory.events.splice(idx, 1)[0];
    scheduleSave();
    emitEvent('events.deleted', { id }, `profile:${removed?.artista_id || req.user?.id || ''}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// My public show events (upcoming only)
router.get('/my/events', async (req, res) => {
  try {
    let userId = null;
    try {
      const h = String(req.headers.authorization || '');
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        userId = payload?.sub || null;
      }
    } catch { userId = null; }
    if (!userId) return res.status(404).json({ error: 'Não autenticado' });
    const now = new Date();
    now.setSeconds(0,0);
    const items = (memory.events || []).filter(e => String(e.artista_id) === String(userId));
    const upcoming = items.filter(e => {
      try {
        const d = new Date(String(e.event_date || ''));
        return d.getTime() >= now.getTime();
      } catch { return true; }
    });
    res.json(upcoming);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Public profile events listing
router.get('/profiles/:id/events', async (req, res) => {
  try {
    const ownerId = String(req.params.id || '').trim();
    const now = new Date(); now.setSeconds(0,0);
    const items = (memory.events || []).filter(e => String(e.artista_id) === String(ownerId));
    const workShows = (Array.isArray(memory.artist_work_events) ? memory.artist_work_events : [])
      .filter(e => String(e.artista_id) === String(ownerId))
      .filter(e => String(e.type || '').toLowerCase().trim() === 'show')
      .map(e => ({
        id: `work_${e.id}`,
        artista_id: e.artista_id,
        event_name: e.title || 'Show',
        event_date: e.date ? `${e.date}T00:00` : null,
        location: e.title || '',
        description: e.notes || '',
        flyer_url: null,
        ticket_price_cents: null,
        purchase_contact: null,
        created_at: e.created_at || new Date().toISOString()
      }));
    const merged = [...items, ...workShows].reduce((acc, cur) => {
      if (!acc.find(x => String(x.id) === String(cur.id))) acc.push(cur);
      return acc;
    }, []);
    const upcoming = merged.filter(e => {
      try {
        const d = new Date(String(e.event_date || ''));
        return d.getTime() >= now.getTime();
      } catch { return true; }
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    res.json(upcoming);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Seller endpoints (aliases/minimal data to avoid 404 in Seller pages)
router.get('/seller/artists', async (req, res) => {
  try {
    const list = await Profile.findAll({ where: { cargo: 'Artista' } });
    res.json(list || []);
  } catch {
    res.json([]);
  }
});
router.get('/seller/leads', async (req, res) => {
  try {
    res.json(Array.isArray(memory.sellerLeads) ? memory.sellerLeads : []);
  } catch {
    res.json([]);
  }
});
router.get('/seller/leads/:id/history', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const map = memory.sellerLeadHistory || {};
    res.json(Array.isArray(map[id]) ? map[id] : []);
  } catch {
    res.json([]);
  }
});
router.get('/seller/contractors', async (req, res) => {
  try {
    res.json(Array.isArray(memory.contractors) ? memory.contractors : []);
  } catch {
    res.json([]);
  }
});
router.get('/seller/calendar', async (req, res) => {
  try {
    const ym = String(req.query.month || '').trim(); // YYYY-MM
    const events = Array.isArray(memory.events) ? memory.events : [];
    const out = events.filter(e => {
      const d = new Date(String(e.event_date || ''));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      return !ym || key === ym;
    });
    res.json(out);
  } catch {
    res.json([]);
  }
});
router.get('/seller/artist-events', async (req, res) => {
  try {
    const artistId = String(req.query.artist_id || '').trim();
    const ym = String(req.query.month || '').trim();
    const events = Array.isArray(memory.events) ? memory.events : [];
    const out = events.filter(e => {
      const byArtist = !artistId || String(e.artista_id) === artistId;
      const d = new Date(String(e.event_date || ''));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const byMonth = !ym || key === ym;
      return byArtist && byMonth;
    }).map(e => ({ title: e.event_name || 'Show', date: (e.event_date || '').split('T')[0] }));
    res.json(out);
  } catch {
    res.json([]);
  }
});
router.get('/seller/artists/:id/events', async (req, res) => {
  try {
    const artistId = String(req.params.id || '').trim();
    const ym = String(req.query.month || '').trim();
    const events = Array.isArray(memory.events) ? memory.events : [];
    const out = events.filter(e => {
      const byArtist = String(e.artista_id) === artistId;
      const d = new Date(String(e.event_date || ''));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const byMonth = !ym || key === ym;
      return byArtist && byMonth;
    });
    res.json(out);
  } catch {
    res.json([]);
  }
});
router.get('/seller/dashboard', async (req, res) => {
  try {
    const goals = memory.sellerGoals || { shows_target: 10, current_shows: 0, revenue_target: 50000, current_revenue: 0 };
    res.json(goals);
  } catch {
    res.json({ shows_target: 10, current_shows: 0, revenue_target: 50000, current_revenue: 0 });
  }
});
router.get('/seller/proposals', async (req, res) => {
  try {
    res.json(Array.isArray(memory.proposals) ? memory.proposals : []);
  } catch {
    res.json([]);
  }
});

// Seller finance summary (commissions and receipts overview)
router.get('/seller/finance/summary', async (req, res) => {
  try {
    const events = Array.isArray(memory.events) ? memory.events : [];
    const normalized = [];
    for (const e of events) {
      try {
        const artist = e.artista_id ? await Profile.findByPk(e.artista_id) : null;
        const title = e.title || e.event_name || 'Show';
        const date = e.date || (e.event_date ? String(e.event_date).split('T')[0] : new Date().toISOString().slice(0,10));
        const revenue = Number(e.revenue || 0);
        const seller_commission = Number(e.seller_commission || 0);
        const status = e.status || 'pendente';
        normalized.push({
          id: e.id,
          title,
          date,
          revenue,
          seller_commission,
          status,
          artist: artist ? { id: artist.id, nome: artist.nome || artist.nome_completo_razao_social } : null,
          receipt_seller: e.receipt_seller || null,
          receipt_artist: e.receipt_artist || null,
          receipt_house: e.receipt_house || null,
          receipt_manager: e.receipt_manager || null,
        });
      } catch {
        // ignore event normalization errors
      }
    }
    const totalSold = normalized.reduce((acc, ev) => acc + (ev.revenue || 0), 0);
    const totalCommissions = normalized.reduce((acc, ev) => acc + (ev.seller_commission || 0), 0);
    const paidCommissions = normalized.filter(ev => ev.status === 'pago').reduce((acc, ev) => acc + (ev.seller_commission || 0), 0);
    const pendingCommissions = totalCommissions - paidCommissions;
    res.json({
      totalSold,
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      events: normalized
    });
  } catch {
    res.json({ totalSold: 0, totalCommissions: 0, pendingCommissions: 0, paidCommissions: 0, events: [] });
  }
});

// Update finance distribution for a specific event
router.put('/events/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const idx = (memory.events || []).findIndex(ev => ev.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Evento não encontrado' });
    const prev = memory.events[idx] || {};
    const payload = {
      revenue: Number(req.body?.revenue || prev.revenue || 0),
      artist_share: Number(req.body?.artist_share || prev.artist_share || 0),
      house_cut: Number(req.body?.house_cut || prev.house_cut || 0),
      seller_commission: Number(req.body?.seller_commission || prev.seller_commission || 0),
      status: String(req.body?.status || prev.status || 'pendente')
    };
    const next = { ...prev, ...payload, updated_at: new Date().toISOString() };
    memory.events[idx] = next;
    emitEvent('events.updated', next, `profile:${next?.artista_id || ''}`);
    res.json(next);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Upload receipts and optional contract for an event; allow toggling paid/contract
router.post('/artist/finance/events/:id/receipts', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const idx = (memory.events || []).findIndex(ev => ev.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Evento não encontrado' });
    const prev = memory.events[idx] || {};
    const markAsPaid = !!req.body?.markAsPaid;
    const hasContract = !!req.body?.hasContract;
    const next = {
      ...prev,
      receipt_artist: req.body?.receipt_artist || prev.receipt_artist || null,
      receipt_seller: req.body?.receipt_seller || prev.receipt_seller || null,
      receipt_house: req.body?.receipt_house || prev.receipt_house || null,
      receipt_manager: req.body?.receipt_manager || prev.receipt_manager || null,
      contract_url: req.body?.contract_file || prev.contract_url || null,
      has_contract: hasContract,
      status: markAsPaid ? 'pago' : (prev.status || 'pendente'),
      updated_at: new Date().toISOString()
    };
    memory.events[idx] = next;
    emitEvent('events.updated', next, `profile:${next?.artista_id || ''}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Analytics by artist (flex filter to support different payload shapes)
router.get('/analytics/artist/:id/events', async (req, res) => {
  try {
    const artistId = String(req.params.id || '').trim();
    const list = (memory.analytics || []).filter(ev => {
      const p = ev?.payload || {};
      return String(ev.artist_id || p.artist_id || p.profile_id || '') === artistId;
    });
    const normalized = list.map((ev) => {
      const p = ev?.payload && typeof ev.payload === 'object' ? ev.payload : {};
      const base = {
        id: ev?.id,
        type: ev?.type,
        ip_hash: ev?.ip_hash,
        created_at: ev?.created_at,
        artist_id: ev?.artist_id || p?.artist_id || p?.profile_id || null,
        music_id: ev?.music_id || p?.music_id || p?.id || null,
        duration_seconds: Number(ev?.duration_seconds ?? p?.duration_seconds ?? 0) || 0,
        payload: p
      };
      return { ...p, ...base, payload: p };
    });
    res.json(normalized);
  } catch {
    res.json([]);
  }
});

// Finance events alias for artist dashboard
router.get('/artist/finance/events', async (req, res) => {
  try {
    res.json(memory.events);
  } catch {
    res.json([]);
  }
});

// Songs of current user (graceful if no token)
router.get('/songs/mine', async (req, res) => {
  try {
    let userId = null;
    try {
      const h = String(req.headers.authorization || '');
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        userId = payload?.sub || null;
      }
    } catch { userId = null; }
    if (!userId) return res.json([]);
    const arr = (memory.musics || []).filter(m => String(m.artista_id) === String(userId));
    res.json(arr);
  } catch {
    res.json([]);
  }
});

router.post('/compositions/:id/like', async (req, res) => {
  const id = req.params.id;
  const ip = String(req.body?.ip_hash || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').trim();
  const idx = memory.compositions.findIndex(c => c.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Composição não encontrada' });
  const arr = Array.isArray(memory.likes[id]) ? memory.likes[id] : [];
  const exists = arr.includes(ip);
  const next = exists ? arr.filter(x => x !== ip) : arr.concat(ip);
  memory.likes[id] = next;
  scheduleSave();
  res.json({ liked: !exists, likes: next.length });
});

router.get('/compositions/:id/likes', async (req, res) => {
  const id = req.params.id;
  const ip = String(req.query?.ip_hash || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').trim();
  const arr = Array.isArray(memory.likes[id]) ? memory.likes[id] : [];
  const liked = arr.includes(ip);
  res.json({ likes: arr.length, liked });
});

router.get('/seller/artist-events', async (req, res) => {
  try {
    const artistId = String(req.query.artist_id || '').trim();
    const arr = (memory.artist_work_events || []).filter(e => !artistId || String(e.artista_id) === artistId);
    res.json(arr);
  } catch {
    res.json([]);
  }
});

router.get('/artist/events', async (req, res) => {
  try {
    let userId = null;
    try {
      const h = String(req.headers.authorization || '');
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        userId = payload?.sub || null;
      }
    } catch (err) { console.error(err); userId = null; }
    if (!userId) return res.json([]);
    const arr = (memory.artist_work_events || []).filter(e => String(e.artista_id) === String(userId));
    res.json(arr);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post('/artist/events', auth, async (req, res) => {
  try {
    const item = {
      id: `evt_${Date.now()}`,
      artista_id: req.user?.id || null,
      title: req.body?.title || 'Evento',
      date: req.body?.date || new Date().toISOString().slice(0,10),
      type: req.body?.type || 'lançamento',
      notes: req.body?.notes || '',
      created_at: new Date().toISOString()
    };
    memory.artist_work_events.unshift(item);
    scheduleSave();
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/artist/todos', async (req, res) => {
  try {
    let userId = null;
    try {
      const h = String(req.headers.authorization || '');
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        userId = payload?.sub || null;
      }
    } catch { userId = null; }
    if (!userId) return res.json([]);
    const arr = (memory.artist_todos || []).filter(t => String(t.artista_id) === String(userId));
    res.json(arr);
  } catch {
    res.json([]);
  }
});

router.post('/artist/todos', auth, async (req, res) => {
  try {
    const item = {
      id: `todo_${Date.now()}`,
      artista_id: req.user?.id || null,
      title: req.body?.title || 'Tarefa',
      due_date: req.body?.due_date || null,
      status: 'pendente',
      created_at: new Date().toISOString()
    };
    memory.artist_todos.unshift(item);
    scheduleSave();
    emitEvent('todos.created', item, `profile:${item.artista_id || ''}`);
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});


router.post('/artist/todos/:id/status', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const status = String(req.body?.status || '').trim();
    const allowed = ['pendente','em_andamento','concluido'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const idx = (memory.artist_todos || []).findIndex(t => t.id === id && String(t.artista_id) === String(req.user?.id));
    if (idx < 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
    memory.artist_todos[idx] = { ...memory.artist_todos[idx], status, updated_at: new Date().toISOString() };
    emitEvent('todos.updated', memory.artist_todos[idx], `profile:${req.user?.id || ''}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Create a gallery post
router.post('/posts', async (req, res) => {
  try {
    const id = `post_${Date.now()}`;
    const user_id = req.body?.user_id || null;
    const media_type = String(req.body?.media_type || 'image').toLowerCase();
    let media_url = req.body?.media_url || null;
    const link_url = req.body?.link_url || null;
    const caption = req.body?.caption || '';
    const scopeRaw = String(req.body?.scope || 'public').toLowerCase().trim();
    const scope = scopeRaw === 'feed' ? 'feed' : 'public';
    if (media_type === 'link' && link_url) {
      const safe = String(link_url || '').replace(/[`"'<>]/g, '').trim();
      const m = safe.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/i);
      const vid = m && m[2] && m[2].length === 11 ? m[2] : null;
      if (vid) {
        media_url = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
      }
    }
    if (media_type === 'text') {
      media_url = null;
    }
    if (media_type === 'image' && (!media_url || media_url === '')) {
      media_url = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2236%22 font-family=%22Arial%22>Imagem indisponível</text></svg>';
    }
    const item = {
      id,
      user_id,
      media_url,
      media_type,
      link_url,
      caption,
      scope,
      created_at: new Date().toISOString()
    };
    memory.posts.unshift(item);
    scheduleSave();
    console.log('POST /posts created', { id, user_id, media_type, has_link: !!link_url, media_url_len: (media_url || '').length });
    if (user_id && scope !== 'feed' && media_type !== 'text') {
      const key = String(user_id);
      if (!memory.profileGallery[key]) {
        memory.profileGallery[key] = { video: [], image: [], link: [] };
      }
      const bucket = media_type === 'video' ? 'video' : (media_type === 'link' ? 'link' : 'image');
      memory.profileGallery[key][bucket].unshift(item);
    }
    const arr = Array.isArray(memory.likes[id]) ? memory.likes[id] : [];
    emitEvent('posts.created', item, user_id ? `profile:${user_id}` : null);
    res.json({ ...item, likes_count: arr.length });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Delete a gallery post
router.delete('/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const idx = memory.posts.findIndex(p => p.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Post não encontrado' });
    const removed = memory.posts.splice(idx, 1)[0];
    delete memory.likes[id];
    scheduleSave();
    emitEvent('posts.deleted', { id, user_id: removed?.user_id || null }, removed?.user_id ? `profile:${removed.user_id}` : null);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Like/unlike a gallery post
router.post('/posts/:id/like', async (req, res) => {
  const id = req.params.id;
  const ip = String(req.body?.ip_hash || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').trim();
  const existsIdx = memory.posts.findIndex(p => p.id === id);
  if (existsIdx < 0) return res.status(404).json({ error: 'Post não encontrado' });
  const arr = Array.isArray(memory.likes[id]) ? memory.likes[id] : [];
  const exists = arr.includes(ip);
  const next = exists ? arr.filter(x => x !== ip) : arr.concat(ip);
  memory.likes[id] = next;
  emitEvent('posts.likes.updated', { id, likes: next.length });
  res.json({ liked: !exists, likes: next.length });
});

// Retrieve likes info for a gallery post
router.get('/posts/:id/likes', async (req, res) => {
  const id = req.params.id;
  const ip = String(req.query?.ip_hash || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').trim();
  const arr = Array.isArray(memory.likes[id]) ? memory.likes[id] : [];
  const liked = arr.includes(ip);
  res.json({ likes: arr.length, liked });
});

router.get('/users/:id/quota', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const user = await Profile.findByPk(id);
    const planRaw = String(user?.plano || '');
    const plan = planRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const creditos_envio = Number(user?.creditos_envio || 0);
    const creditos_hit_semana = Number(user?.creditos_hit_semana || 0);
    let plano = 'Sem Plano';
    if (plan.includes('vitalicio') || plan.includes('lifetime')) {
      plano = 'Vitalicio';
    } else if (plan.includes('anual')) {
      plano = 'Anual';
    } else if (plan.includes('mensal') || plan.includes('premium')) {
      plano = 'Mensal';
    } else if (plan.includes('avulso') || plan.includes('gratuito') || plan.includes('free')) {
      plano = 'Avulso';
    }
    let uploads_remaining = 0;
    if (plan.includes('vitalicio') || plan.includes('lifetime')) {
      uploads_remaining = Number.MAX_SAFE_INTEGER;
    } else if (plan.includes('avulso') || plan.includes('gratuito') || plan.includes('free')) {
      uploads_remaining = 1;
    } else if (plan.includes('mensal')) {
      uploads_remaining = 4;
    } else if (plan.includes('anual')) {
      uploads_remaining = 48;
    } else {
      uploads_remaining = 0;
    }
    res.json({
      uploads_remaining,
      plano,
      bonus_quota: Number(user?.bonus_quota || 0),
      plan_started_at: user?.plan_started_at || null,
      creditos_envio,
      creditos_hit_semana
    });
  } catch {
    res.json({ uploads_remaining: 0, plano: 'Sem Plano', bonus_quota: 0, plan_started_at: null, creditos_envio: 0, creditos_hit_semana: 0 });
  }
});

router.post('/credits/hit-of-week/transfer', auth, async (req, res) => {
  try {
    const fromId = String(req.user?.id || '').trim();
    const toId = String(req.body?.to_profile_id || req.body?.to_id || '').trim();
    const amount = Number(req.body?.amount || 0);
    const n = Number.isFinite(amount) ? Math.floor(amount) : 0;
    if (!fromId) return res.status(401).json({ error: 'Não autenticado' });
    if (!toId) return res.status(400).json({ error: 'Destino obrigatório' });
    if (String(fromId) === String(toId)) return res.status(400).json({ error: 'Destino inválido' });
    if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ error: 'Quantidade inválida' });

    const result = await sequelize.transaction(async (t) => {
      const from = await Profile.findByPk(fromId, { transaction: t });
      const to = await Profile.findByPk(toId, { transaction: t });
      if (!from) return { ok: false, status: 404, error: 'Remetente não encontrado' };
      if (!to) return { ok: false, status: 404, error: 'Destino não encontrado' };

      const fromCredits = Number(from.creditos_hit_semana || 0);
      if (fromCredits < n) return { ok: false, status: 402, error: 'Créditos insuficientes' };
      from.creditos_hit_semana = fromCredits - n;
      to.creditos_hit_semana = Number(to.creditos_hit_semana || 0) + n;
      await from.save({ transaction: t });
      await to.save({ transaction: t });
      return {
        ok: true,
        from: { id: from.id, creditos_hit_semana: Number(from.creditos_hit_semana || 0) },
        to: { id: to.id, creditos_hit_semana: Number(to.creditos_hit_semana || 0) }
      };
    });

    if (!result.ok) return res.status(result.status || 400).json({ error: result.error || 'Erro' });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/musics/:id/external-metrics', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const src = String(req.query.source || '').trim();
    const key = src ? `${id}::${src}` : id;
    const item = memory.externalMetrics[key] || null;
    if (!item) return res.status(404).json({ error: 'Não encontrado' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/musics/:id/external-metrics', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const src = String(req.body?.source || req.query.source || 'manual').trim();
    const plays = Number(req.body?.plays || 0);
    const listeners = Number(req.body?.listeners || 0);
    const revenue = Number(req.body?.revenue || 0);
    const updated_at = req.body?.updated_at ? new Date(req.body.updated_at).toISOString() : new Date().toISOString();
    const item = { music_id: id, source: src, plays, listeners, revenue, updated_at };
    const key = src ? `${id}::${src}` : id;
    memory.externalMetrics[key] = item;
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/songs/external-metrics', async (req, res) => {
  try {
    const arr = Object.values(memory.externalMetrics || {});
    res.json(arr);
  } catch {
    res.json([]);
  }
});

router.get('/marketing/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const data = (memory.marketing || {})[id] || null;
    res.json(data);
  } catch {
    res.json(null);
  }
});

router.get('/artist/marketing/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const data = (memory.marketing || {})[id] || null;
    res.json(data);
  } catch {
    res.json(null);
  }
});

router.put('/marketing/:id', auth, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const payload = req.body || {};
    memory.marketing[id] = { ...(memory.marketing[id] || {}), ...payload, saved_at: new Date().toISOString() };
    emitEvent('marketing.updated', { id, data: memory.marketing[id] }, `profile:${id}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao salvar' });
  }
});

router.get('/admin/artist/:id/todos', async (req, res) => {
  try {
    const artistId = String(req.params.id || '').trim();
    const arr = (memory.artist_todos || []).filter(t => String(t.artista_id) === String(artistId));
    res.json(arr);
  } catch {
    res.json([]);
  }
});

router.get('/artist/compositions', async (req, res) => {
  try {
    let userId = null;
    try {
      const h = String(req.headers.authorization || '');
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        userId = payload?.sub || null;
      }
    } catch { userId = null; }
    if (!userId) return res.json([]);
    const arr = (memory.compositions || []).filter(c => String(c.composer_id) === String(userId));
    res.json(arr);
  } catch {
    res.json([]);
  }
});

router.get('/users/:id/music-count', async (req, res) => {
  try {
    const ownerId = String(req.params.id || '').trim();
    const start = req.query.start ? new Date(String(req.query.start)) : null;
    const end = req.query.end ? new Date(String(req.query.end)) : null;
    const inRange = (iso) => {
      const d = new Date(String(iso || ''));
      const t = d.getTime();
      if (!Number.isFinite(t)) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    };
    const list = (memory.musics || []).filter(m => String(m.artista_id) === ownerId && inRange(m.created_at));
    res.json(list.length);
  } catch {
    res.json(0);
  }
});

router.get('/profiles/:id/musics', async (req, res) => {
  const ownerId = req.params.id;
  const list = memory.musics
    .filter(m => String(m.artista_id) === String(ownerId))
    .filter(m => {
      const s = String(m.status || '').toLowerCase().trim();
      return s === 'aprovado' || s === 'aprovada' || s === 'approved' || s === 'aceito' || s === 'aceita';
    })
    .map(m => {
      const arr = Array.isArray(memory.likes[m.id]) ? memory.likes[m.id] : [];
      return { ...m, likes_count: arr.length };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

router.get('/profiles/:id/feats', async (req, res) => {
  const ownerId = req.params.id;
  const list = memory.musics
    .filter(m => {
      const featIds = Array.isArray(m.feat_beatwap_artist_ids) ? m.feat_beatwap_artist_ids : [];
      if (!featIds.includes(ownerId)) return false;
      const s = String(m.status || '').toLowerCase().trim();
      return s === 'aprovado' || s === 'aprovada' || s === 'approved' || s === 'aceito' || s === 'aceita';
    })
    .map(m => {
      const arr = Array.isArray(memory.likes[m.id]) ? memory.likes[m.id] : [];
      return { ...m, likes_count: arr.length };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

router.get('/profiles/:id/produced-musics', async (req, res) => {
  const ownerId = req.params.id;
  const normalize = (v) => String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let owner = null;
  try {
    owner = await Profile.findByPk(ownerId);
  } catch {
    owner = null;
  }

  const ownerNames = new Set(
    [owner?.nome, owner?.nome_completo_razao_social]
      .map(normalize)
      .filter((x) => x)
  );

  const list = memory.musics
    .filter(m => {
      const s = String(m.status || '').toLowerCase().trim();
      if (s !== 'aprovado' && s !== 'aprovada' && s !== 'approved' && s !== 'aceito' && s !== 'aceita') return false;

      if (String(m.producer_id || '') === String(ownerId)) return true;
      if (String(m.produced_by || '') === String(ownerId)) return true;

      const producerName = normalize(m.producer);
      if (producerName && ownerNames.has(producerName)) return true;

      const producedByName = normalize(m.produced_by);
      if (producedByName && ownerNames.has(producedByName)) return true;

      return false;
    })
    .map(m => {
      const arr = Array.isArray(memory.likes[m.id]) ? memory.likes[m.id] : [];
      return { ...m, likes_count: arr.length };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

router.get('/profiles/:id/recorded-musics', async (req, res) => {
  const composerId = req.params.id;
  const list = memory.musics
    .filter(m => String(m.composer_partner_id) === String(composerId))
    .filter(m => String(m.status).toLowerCase() === 'aprovado')
    .map(m => {
      const arr = Array.isArray(memory.likes[m.id]) ? memory.likes[m.id] : [];
      return { ...m, likes_count: arr.length };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

// Album tracks by album id
router.get('/albums/:id/tracks', async (req, res) => {
  try {
    const albumId = String(req.params.id || '').trim();
    const list = (memory.musics || [])
      .filter(m => String(m.album_id || '') === albumId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json(list);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/compositions/latest', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '20')) || 20));
    const candidates = (memory.musics || [])
      .filter(m => m.composer_partner_id)
      .filter(m => String(m.status).toLowerCase() === 'aprovado')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const out = [];
    for (const m of candidates) {
      if (out.length >= limit) break;
      const composerId = m.composer_partner_id;
      let allowed = false;
      let composer = null;
      try {
        composer = await Profile.findByPk(composerId);
        const planRaw = String(composer?.plano || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (planRaw.includes('mensal') || planRaw.includes('anual') || planRaw.includes('vitalicio') || planRaw.includes('lifetime')) {
          allowed = true;
        }
      } catch { allowed = false; }
      if (!allowed) continue;
      out.push({
        ...m,
        composer_id: composerId,
        composer_name: composer?.nome || composer?.nome_completo_razao_social || null,
        composer_phone: composer?.celular || null
      });
    }
    if (out.length > 0) return res.json(out);
    // Fallback: use public compositions (approved) if no partner-recorded musics were found
    const comps = (memory.compositions || [])
      .filter(c => String(c.status).toLowerCase() === 'approved')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
    const ids = Array.from(new Set(comps.map(c => c?.composer_id).filter(Boolean).map(String)));
    let byId = new Map();
    try {
      if (ids.length) {
        const rows = await Profile.findAll({ where: { id: ids } });
        byId = new Map((rows || []).map(r => [String(r.id), r]));
      }
    } catch { byId = new Map(); }

    const fallback = comps.map(c => {
      const p = c?.composer_id ? byId.get(String(c.composer_id)) : null;
      const composer_name = c?.composer_name || c?.author_name || c?.nome_autor || c?.nome_compositor || p?.nome || p?.nome_completo_razao_social || null;
      const composer_phone = c?.composer_phone || c?.celular || c?.whatsapp || c?.phone || p?.celular || null;
      const title = c?.title || c?.titulo || 'Sem título';
      return {
        ...c,
        title,
        titulo: title,
        composer_id: c?.composer_id || null,
        composer_name,
        composer_phone,
        nome_artista: composer_name || 'Compositor',
        cover_url: c?.cover_url || null,
        audio_url: c?.audio_url || null,
        created_at: c?.created_at
      };
    });
    res.json(fallback);
  } catch {
    res.json([]);
  }
});

async function grantAccessForOrder(order, payment, transaction) {
  const profileId = order?.profile_id ? String(order.profile_id) : '';
  if (!profileId) return { ok: false };

  const profile = await Profile.findByPk(profileId, { transaction });
  if (!profile) return { ok: false };

  const productType = String(order?.product_type || '').toLowerCase().trim();
  const productKey = String(order?.product_key || '').toLowerCase().trim();
  const qty = Number(order?.quantity || 0);
  const quantity = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;

  const updates = {};
  if (productType === 'plan') {
    if (productKey === 'mensal') updates.plano = 'Mensal';
    if (productKey === 'anual') updates.plano = 'Anual';
    if (productKey === 'vitalicio' || productKey === 'vitalício') updates.plano = 'Vitalicio';
    if (productKey === 'avulso' || productKey === 'gratuito') updates.plano = 'Avulso';
    if (updates.plano) updates.plan_started_at = new Date();
  }

  if (productType === 'credits_upload') {
    const cur = Number(profile.creditos_envio || 0);
    updates.creditos_envio = cur + quantity;
  }

  if (productType === 'credits_hit') {
    const cur = Number(profile.creditos_hit_semana || 0);
    updates.creditos_hit_semana = cur + quantity;
  }

  const keys = Object.keys(updates);
  if (!keys.length) return { ok: true };

  for (const k of keys) profile[k] = updates[k];
  await profile.save({ transaction });

  try { emitEvent('profile.updated', { id: profile.id }, `profile:${profile.id}`); } catch { void 0; }
  try { emitEvent('profile.payment.approved', { profile_id: profile.id, order_id: order.id, payment_id: payment?.id || null }, `profile:${profile.id}`); } catch { void 0; }
  return { ok: true };
}

function productFromCreatePaymentBody(body, user) {
  const b = body || {};
  const userType = normalizeUserType(b.user_type || b.userType || user?.cargo);

  const productType = String(b.product_type || b.productType || '').toLowerCase().trim();
  if (productType === 'plan') {
    const planKey = String(b.plan_key || b.planKey || b.plan || '').toLowerCase().trim();
    const amount_cents = planPriceCents(planKey, userType);
    const installments_max = planKey === 'anual' ? 12 : 1;
    return {
      product_type: 'plan',
      product_key: planKey,
      quantity: 1,
      amount_cents,
      installments_max,
      description: `Plano ${planLabel(planKey)}`
    };
  }

  if (productType === 'credits_upload' || productType === 'creditos_envio') {
    const q = Number(b.quantity || b.qtd || 0);
    const quantity = Number.isFinite(q) ? Math.max(1, Math.floor(q)) : 1;
    const unit = 500;
    return {
      product_type: 'credits_upload',
      product_key: 'creditos_envio',
      quantity,
      amount_cents: unit * quantity,
      installments_max: 1,
      description: `Créditos de envio (${quantity})`
    };
  }

  if (productType === 'credits_hit' || productType === 'creditos_hit') {
    const q = Number(b.quantity || b.qtd || 0);
    const quantity = Number.isFinite(q) ? Math.max(1, Math.floor(q)) : 1;
    const unit = 500;
    return {
      product_type: 'credits_hit',
      product_key: 'creditos_hit_semana',
      quantity,
      amount_cents: unit * quantity,
      installments_max: 1,
      description: `Créditos Hit da Semana (${quantity})`
    };
  }

  const planKey = String(b.plan_key || b.planKey || b.plan || '').toLowerCase().trim();
  const amount_cents = planPriceCents(planKey, userType);
  const installments_max = planKey === 'anual' ? 12 : 1;
  if (amount_cents > 0) {
    return {
      product_type: 'plan',
      product_key: planKey,
      quantity: 1,
      amount_cents,
      installments_max,
      description: `Plano ${planLabel(planKey)}`
    };
  }

  const value = Number(b.valor || b.value || 0);
  const amount = Number.isFinite(value) ? Math.max(0, value) : 0;
  return {
    product_type: 'custom',
    product_key: 'custom',
    quantity: 1,
    amount_cents: Math.round(amount * 100),
    installments_max: 1,
    description: String(b.descricao || b.description || 'Pagamento')
  };
}

router.post('/criar-pagamento', auth, async (req, res) => {
  try {
    const product = productFromCreatePaymentBody(req.body, req.user);
    if (!product.amount_cents || product.amount_cents <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const profile = await Profile.findByPk(req.user?.id);
    const customer_name = String(req.body?.nome || req.body?.name || profile?.nome || '').trim() || null;
    const customer_email = String(req.body?.email || profile?.email || '').trim() || null;
    if (!customer_email) return res.status(400).json({ error: 'Email obrigatório' });

    const idempotency_key = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const external_reference = `bw_${Date.now()}_${idempotency_key.slice(0, 8)}`;

    const order = await PaymentOrder.create({
      profile_id: req.user?.id || null,
      status: 'created',
      product_type: product.product_type,
      product_key: product.product_key,
      quantity: product.quantity,
      amount_cents: product.amount_cents,
      currency: 'BRL',
      description: product.description,
      customer_name,
      customer_email,
      external_reference,
      idempotency_key
    });

    const webhookUrl = pickWebhookUrl();
    const frontendUrl = pickFrontendUrl();
    const backBase = frontendUrl ? `${frontendUrl.replace(/\/+$/, '')}/pagamento/retorno` : '';
    try {
      console.log('[MP] criar-pagamento', {
        profile_id: req.user?.id || null,
        external_reference,
        product_type: product.product_type,
        product_key: product.product_key,
        amount_cents: product.amount_cents,
        notification_url: webhookUrl || null,
        back_urls_base: backBase || null
      });
    } catch { void 0; }

    const preference = {
      items: [
        {
          title: product.description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number((product.amount_cents / 100).toFixed(2))
        }
      ],
      payer: {
        name: customer_name || undefined,
        email: customer_email || undefined
      },
      external_reference,
      ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      ...(backBase
        ? {
          back_urls: {
            success: `${backBase}?status=success&external_reference=${encodeURIComponent(external_reference)}`,
            pending: `${backBase}?status=pending&external_reference=${encodeURIComponent(external_reference)}`,
            failure: `${backBase}?status=failure&external_reference=${encodeURIComponent(external_reference)}`
          },
          auto_return: 'approved'
        }
        : {}),
      metadata: {
        order_id: order.id,
        profile_id: req.user?.id || null,
        product_type: product.product_type,
        product_key: product.product_key,
        quantity: product.quantity
      },
      payment_methods: {
        installments: product.installments_max || 1
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
    try {
      console.log('[MP] preferencia-criada', { external_reference, order_id: order.id, preference_id: created?.id || null });
    } catch { void 0; }

    return res.json({
      order_id: order.id,
      external_reference,
      preference_id: created?.id || null,
      checkout_url
    });
  } catch (err) {
    try { console.error('[MP] criar-pagamento falhou', err); } catch { void 0; }
    return res.status(500).json({ error: err?.message || 'Erro ao criar pagamento' });
  }
});

router.get('/exemplo-pagamento', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BeatWap - Exemplo Mercado Pago</title>
    <style>
      body { font-family: Arial, sans-serif; background:#0b0b0f; color:#e5e7eb; margin:0; padding:24px; }
      .box { max-width:720px; margin:0 auto; background:#11121a; border:1px solid #1f2335; border-radius:16px; padding:20px; }
      label { display:block; font-size:12px; color:#9ca3af; margin-top:12px; }
      input, select { width:100%; padding:10px 12px; margin-top:6px; border-radius:10px; border:1px solid #2b2f45; background:#0b0b0f; color:#e5e7eb; }
      button { margin-top:16px; width:100%; padding:12px; border:0; border-radius:12px; background:#facc15; color:#000; font-weight:800; cursor:pointer; }
      pre { white-space: pre-wrap; word-break: break-word; font-size:12px; background:#0b0b0f; padding:12px; border-radius:12px; border:1px solid #2b2f45; }
      .muted { color:#9ca3af; font-size:12px; }
    </style>
  </head>
  <body>
    <div class="box">
      <h2>Exemplo simples (HTML + JS)</h2>
      <div class="muted">Requer estar logado no site (token JWT). Cole o token abaixo apenas para teste local.</div>

      <label>Bearer Token</label>
      <input id="token" placeholder="Cole aqui o token (JWT)..." />

      <label>Nome</label>
      <input id="nome" placeholder="Seu nome" />

      <label>Email</label>
      <input id="email" placeholder="seuemail@dominio.com" />

      <label>Tipo</label>
      <select id="tipo">
        <option value="plan">Plano</option>
        <option value="credits_upload">Créditos de envio</option>
        <option value="credits_hit">Créditos Hit da Semana</option>
      </select>

      <label id="planLabel">Plano</label>
      <select id="planKey">
        <option value="mensal">Mensal</option>
        <option value="anual">Anual (12x)</option>
      </select>

      <label id="qtyLabel" style="display:none">Quantidade</label>
      <input id="qty" type="number" value="1" min="1" style="display:none" />

      <label>User Type</label>
      <select id="userType">
        <option value="artist">Artista</option>
        <option value="composer">Compositor</option>
      </select>

      <button id="pagar">Pagar</button>
      <pre id="out"></pre>
    </div>

    <script>
      const $ = (id) => document.getElementById(id);
      const out = (v) => { $('out').textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2); };
      const toggle = () => {
        const tipo = $('tipo').value;
        const isPlan = tipo === 'plan';
        $('planLabel').style.display = isPlan ? 'block' : 'none';
        $('planKey').style.display = isPlan ? 'block' : 'none';
        $('qtyLabel').style.display = isPlan ? 'none' : 'block';
        $('qty').style.display = isPlan ? 'none' : 'block';
      };
      $('tipo').addEventListener('change', toggle);
      toggle();

      $('pagar').addEventListener('click', async () => {
        try {
          out('Criando pagamento...');
          const token = $('token').value.trim();
          const payload = {
            nome: $('nome').value.trim(),
            email: $('email').value.trim(),
            user_type: $('userType').value,
            product_type: $('tipo').value,
            plan_key: $('planKey').value,
            quantity: Number($('qty').value || 1)
          };
          const res = await fetch('/api/criar-pagamento', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': 'Bearer ' + token } : {})
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json().catch(() => ({}));
          out(data);
          if (data && data.checkout_url) window.location.href = data.checkout_url;
        } catch (e) {
          out(String(e && e.message ? e.message : e));
        }
      });
    </script>
  </body>
</html>`);
});

router.post('/webhook', async (req, res) => {
  try {
    try {
      console.log('[MP webhook] recebido', {
        path: req.path,
        query: req.query || {},
        type: req.body?.type || req.body?.action || null,
        data: req.body?.data || null,
        resource: req.body?.resource || null
      });
    } catch { void 0; }

    const ok = verifyMPWebhookSignature(req);
    if (!ok) {
      try { console.warn('[MP webhook] assinatura inválida'); } catch { void 0; }
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const paymentId = getMPWebhookDataId(req);
    if (!paymentId) {
      try { console.log('[MP webhook] sem paymentId'); } catch { void 0; }
      return res.json({ ok: true });
    }

    const payment = await mpRequest('GET', `/v1/payments/${encodeURIComponent(paymentId)}`);
    const external_reference = String(payment?.external_reference || '').trim();
    if (!external_reference) {
      try { console.log('[MP webhook] pagamento sem external_reference', { paymentId }); } catch { void 0; }
      return res.json({ ok: true });
    }
    try { console.log('[MP webhook] pagamento consultado', { paymentId, external_reference, status: payment?.status || null }); } catch { void 0; }

    await sequelize.transaction(async (t) => {
      const order = await PaymentOrder.findOne({ where: { external_reference }, transaction: t });
      if (!order) {
        try { console.warn('[MP webhook] pedido não encontrado', { external_reference }); } catch { void 0; }
        return;
      }

      const paymentStatus = String(payment?.status || '').toLowerCase().trim();
      const nextStatus =
        paymentStatus === 'approved' ? 'approved'
          : (paymentStatus === 'pending' || paymentStatus === 'in_process') ? 'pending'
            : paymentStatus === 'rejected' ? 'rejected'
              : paymentStatus === 'cancelled' ? 'cancelled'
                : paymentStatus === 'refunded' ? 'refunded'
                  : paymentStatus === 'charged_back' ? 'charged_back'
                    : 'unknown';

      const amount = Number(payment?.transaction_amount || 0);
      const amountCents = Math.round(amount * 100);
      const currency = String(payment?.currency_id || 'BRL').trim().toUpperCase();
      const expectedCents = Number(order.amount_cents || 0);
      const amountMatches = expectedCents > 0 ? (Math.abs(expectedCents - amountCents) <= 1) : true;
      const currencyMatches = currency === String(order.currency || 'BRL').trim().toUpperCase();
      const extRefMatches = String(order.external_reference) === external_reference;
      const shouldGrant = nextStatus === 'approved' && amountMatches && currencyMatches && extRefMatches;

      const alreadyGranted = !!order.access_granted_at;
      if (shouldGrant && !alreadyGranted) {
        try { console.log('[MP webhook] Pagamento aprovado - liberando acesso', { external_reference, order_id: order.id }); } catch { void 0; }
        const granted = await grantAccessForOrder(order, payment, t);
        if (granted.ok) {
          order.access_granted_at = new Date();
          try { console.log('[MP webhook] acesso liberado', { external_reference, order_id: order.id }); } catch { void 0; }
        } else {
          try { console.warn('[MP webhook] falha ao liberar acesso', { external_reference, order_id: order.id }); } catch { void 0; }
        }
      } else if (shouldGrant && alreadyGranted) {
        try { console.log('[MP webhook] já processado (evitando duplicação)', { external_reference, order_id: order.id }); } catch { void 0; }
      }

      if (nextStatus === 'approved' && (!amountMatches || !currencyMatches || !extRefMatches)) {
        order.status = 'fraud';
      } else {
        order.status = nextStatus;
      }

      order.mp_payment_id = String(payment?.id || paymentId);
      order.mp_payment_status = payment?.status || null;
      order.mp_payment_status_detail = payment?.status_detail || null;
      order.mp_payment_method_id = payment?.payment_method_id || null;
      order.mp_payment_type_id = payment?.payment_type_id || null;
      order.mp_installments = Number.isFinite(Number(payment?.installments)) ? Number(payment.installments) : null;
      order.mp_live_mode = payment?.live_mode != null ? !!payment.live_mode : null;
      order.mp_raw = payment || null;
      await order.save({ transaction: t });

      try {
        if (shouldGrant && !alreadyGranted && transporter && order.customer_email) {
          const to = String(order.customer_email || '').trim();
          if (to) {
            await transporter.sendMail({
              from: mpEnv('SMTP_FROM', mpEnv('SMTP_USER', 'no-reply@beatwap.com.br')),
              to,
              subject: 'Pagamento aprovado',
              text: `Pagamento aprovado. Produto: ${order.description || order.product_type || 'pedido'}`
            });
          }
        }
      } catch { void 0; }
    });

    return res.json({ ok: true });
  } catch (e) {
    try { console.error('[MP webhook] erro', e); } catch { void 0; }
    return res.json({ ok: true });
  }
});
router.get('/sellers/:id/stats', async (req, res) => {
  res.json({ leads: 0, proposals: 0, deals: 0 });
});


// removed conflicting mock endpoints for /profile and /profile/avatar

router.put('/marketing/:id', async (req, res) => {
  res.json({ ok: true, updated_at: new Date().toISOString() });
});

module.exports = router;
