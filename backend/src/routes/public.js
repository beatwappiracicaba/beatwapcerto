const express = require('express');
const { Profile } = require('../models');
const { emitEvent } = require('../realtime');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const { memory, scheduleSave } = require('../memoryStore');

const router = express.Router();

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

    const producersRaw = await Profile.findAll({ where: { cargo: 'Produtor' } });
    const sellersRaw = await Profile.findAll({ where: { cargo: 'Vendedor' } });
    const artistsRaw = await Profile.findAll({ where: { cargo: 'Artista' } });
    const composersRaw = await Profile.findAll({ where: { cargo: 'Compositor' } });
    const addDerived = (row) => {
      const ac = row?.access_control || {};
      return { ...row.toJSON?.() ? row.toJSON() : row, verified: ac?.verified === true };
    };
    const producers = takeDistinctById(sortWithFeaturedFirst(producersRaw.map(addDerived)), 30);
    const sellers = takeDistinctById(sortWithFeaturedFirst(sellersRaw.map(addDerived)), 30);
    const artists = takeDistinctById(sortWithFeaturedFirst(artistsRaw.map(addDerived)), 30);
    const composers = takeDistinctById(sortWithFeaturedFirst(composersRaw.map(addDerived)), 30);
    const compositionsApproved = memory.compositions.filter(c => String(c.status).toLowerCase() === 'approved').map(c => {
      const arr = Array.isArray(memory.likes[c.id]) ? memory.likes[c.id] : [];
      return { ...c, likes_count: arr.length };
    });
    const featuredPlans = memory.featured_plans && typeof memory.featured_plans === 'object' ? memory.featured_plans : null;
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    const publicHit = hit ? {
      id: hit.id,
      theme: hit.theme,
      starts_at: hit.starts_at || null,
      ends_at: hit.ends_at || null,
      entry_fee: Number(hit.entry_fee) || 10,
      entries_count: Array.isArray(hit.entries) ? hit.entries.length : 0,
      winner_entry_id: hit.winner_entry_id || null,
      updated_at: hit.updated_at || null
    } : null;
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

router.post('/hit-of-week/entries', auth, async (req, res) => {
  try {
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.status(400).json({ error: 'Desafio indisponível' });

    const now = Date.now();
    const starts = hit.starts_at ? new Date(hit.starts_at).getTime() : null;
    const ends = hit.ends_at ? new Date(hit.ends_at).getTime() : null;
    if (Number.isFinite(starts) && starts && now < starts) {
      return res.status(400).json({ error: 'Desafio ainda não começou' });
    }
    if (Number.isFinite(ends) && ends && now > ends) {
      return res.status(400).json({ error: 'Desafio encerrado' });
    }

    const title = String(req.body?.title || '').trim();
    const url = String(req.body?.url || '').trim();
    if (!title) return res.status(400).json({ error: 'Título obrigatório' });
    if (!url) return res.status(400).json({ error: 'Link obrigatório' });

    const entry = {
      id: `hit_entry_${Date.now()}`,
      hit_id: hit.id,
      profile_id: req.user?.id || null,
      profile_email: req.user?.email || null,
      title,
      url,
      paid: false,
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

router.get('/releases', (req, res) => res.json([]));
router.get('/compositions', (req, res) => res.json(memory.compositions));
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
    res.json(composers);
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
    .filter(c => (String(c.composer_id) === String(ownerId)) || (String(c.producer_id) === String(ownerId)))
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
      .filter(c => String(c.composer_id) === String(composerId))
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
  const credits = Number(user?.creditos_envio || 0);
  if (credits < n) return { ok: false, error: 'Créditos insuficientes para envio', code: 'NO_CREDITS' };
  user.creditos_envio = credits - n;
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

    const item = {
      id,
      composer_id,
      producer_id,
      title: req.body?.title || 'Sem título',
      genre: req.body?.genre || null,
      description: req.body?.description || null,
      price: req.body?.price ?? null,
      cover_url: req.body?.cover_url || null,
      audio_url: req.body?.audio_url || null,
      status: req.body?.status || 'pending',
      created_at: new Date().toISOString()
    };
    memory.compositions.unshift(item);
    scheduleSave();
    if (item.composer_id) emitEvent('compositions.created', item, `profile:${item.composer_id}`);
    if (item.producer_id) emitEvent('compositions.created', item, `profile:${item.producer_id}`);
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
    memory.compositions[idx] = { ...memory.compositions[idx], status, feedback };
    scheduleSave();
    const updated = memory.compositions[idx];
    if (updated?.composer_id) emitEvent('compositions.updated', { id, item: updated }, `profile:${updated.composer_id}`);
    if (updated?.producer_id) emitEvent('compositions.updated', { id, item: updated }, `profile:${updated.producer_id}`);
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
  const { type, payload, ip_hash } = req.body || {};
  memory.analytics.push({ id: `ev_${Date.now()}`, type, payload, ip_hash, created_at: new Date().toISOString() });
  scheduleSave();
  res.json({ ok: true });
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
    const upcoming = items.filter(e => {
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
    res.json(list);
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
    const planRaw = String(user?.plano || 'sem plano');
    const plan = planRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const creditos_envio = Number(user?.creditos_envio || 0);
    let uploads_remaining = 0;
    if (plan.includes('vitalicio') || plan.includes('lifetime')) {
      uploads_remaining = Number.MAX_SAFE_INTEGER;
    } else if (plan.includes('avulso')) {
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
      plano: user?.plano || 'sem plano',
      bonus_quota: Number(user?.bonus_quota || 0),
      plan_started_at: user?.plan_started_at || null,
      creditos_envio
    });
  } catch {
    res.json({ uploads_remaining: 0, plano: 'sem plano', bonus_quota: 0, plan_started_at: null, creditos_envio: 0 });
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
  const list = memory.musics
    .filter(m => String(m.producer_id) === String(ownerId))
    .filter(m => String(m.status).toLowerCase() === 'aprovado')
    .filter(m => m.is_beatwap_produced === true || String(m.produced_by).toLowerCase() === 'beatwap')
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
    .filter(m => m.is_beatwap_produced === true || String(m.produced_by).toLowerCase() === 'beatwap')
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
router.get('/sellers/:id/stats', async (req, res) => {
  res.json({ leads: 0, proposals: 0, deals: 0 });
});

// removed conflicting mock endpoints for /profile and /profile/avatar

router.put('/marketing/:id', async (req, res) => {
  res.json({ ok: true, updated_at: new Date().toISOString() });
});

module.exports = router;
