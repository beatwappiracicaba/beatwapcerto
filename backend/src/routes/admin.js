const express = require('express');
const { Profile } = require('../models');
const { auth } = require('../middleware/auth');
const { memory, scheduleSave } = require('../memoryStore');

const router = express.Router();
if (!Array.isArray(memory.musics) || memory.musics.length === 0) {
  memory.musics = [{
    id: 'music_1',
    titulo: 'Demo Track',
    nome_artista: 'Artista Demo',
    artista_id: null,
    cover_url: null,
    audio_url: 'https://example.com/demo.mp3',
    authorization_url: null,
    is_original: true,
    status: 'aprovado',
    estilo: 'Pop',
    created_at: new Date().toISOString(),
  }];
  scheduleSave();
}

// Helper to attach known artist id
async function ensureArtistIds() {
  try {
    const artist = await Profile.findOne({ where: { cargo: 'Artista' } });
    if (artist) {
      memory.musics.forEach(m => { if (!m.artista_id) m.artista_id = artist.id; });
    }
  } catch { /* ignore */ }
}

// Admin stats
router.get('/admin/stats', async (req, res) => {
  try {
    await ensureArtistIds();
    const artists = await Profile.count({ where: { cargo: 'Artista' } });
    const musics = memory.musics.length;
    const pending = memory.musics.filter(m => String(m.status).toLowerCase() === 'pendente').length;
    res.json({ artists, musics, pending });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Admin musics with optional filters
router.get('/admin/musics', async (req, res) => {
  await ensureArtistIds();
  const status = String(req.query.status || '').trim();
  const artistId = String(req.query.artist_id || '').trim();
  let list = memory.musics.slice();
  if (status) list = list.filter(m => String(m.status).toLowerCase() === String(status).toLowerCase());
  if (artistId) list = list.filter(m => String(m.artista_id || '') === artistId);
  res.json(list);
});

// Artist metrics
router.get('/admin/artist/:id/metrics', async (req, res) => {
  const id = req.params.id;
  // Simple mock metrics
  res.json({
    artist_id: id,
    total_plays: 1234,
    ouvintes_mensais: 567,
    receita_estimada: 890.12
  });
});

// Batch metrics for multiple artists: /admin/artists/metrics?ids=id1,id2
router.get('/admin/artists/metrics', async (req, res) => {
  try {
    const idsParam = String(req.query.ids || '').trim();
    if (!idsParam) return res.status(400).json({ error: 'Parâmetro ids obrigatório' });
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    const rows = ids.map((id, idx) => ({
      artist_id: id,
      total_plays: 1000 + idx * 37,
      ouvintes_mensais: 500 + idx * 11,
      receita_estimada: 750.25 + idx * 5.1
    }));
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Producer projects CRUD
router.get('/producer-projects', (req, res) => {
  res.json(memory.projects);
});
router.post('/producer-projects', auth, (req, res) => {
  const id = `proj_${Date.now()}`;
  const { producer_id, title, url, platform, published } = req.body || {};
  const item = {
    id,
    producer_id: producer_id || req.user?.id || null,
    title: String(title || 'Projeto'),
    url: String(url || ''),
    platform: String(platform || 'Outro'),
    published: Boolean(published),
    cover_url: null,
    created_at: new Date().toISOString(),
  };
  memory.projects.unshift(item);
  scheduleSave();
  res.json(item);
});
router.delete('/producer-projects/:id', auth, (req, res) => {
  const id = req.params.id;
  memory.projects = memory.projects.filter(p => p.id !== id);
  scheduleSave();
  res.json({ ok: true });
});

// Public music endpoints to support Dashboard/Artist workflows
router.get('/musics', async (req, res) => {
  await ensureArtistIds();
  const list = memory.musics.map(m => {
    const arr = Array.isArray(memory.likes?.[m.id]) ? memory.likes[m.id] : [];
    return { ...m, likes_count: arr.length };
  });
  res.json(list);
});
router.get('/admin/sellers', async (req, res) => {
  try {
    const raws = await Profile.findAll({ where: { cargo: 'Vendedor' } });
    res.json(Array.isArray(raws) ? raws : []);
  } catch {
    res.json([]);
  }
});
router.post('/musics', auth, async (req, res) => {
  try {
    const id = `music_${Date.now()}`;
    const item = {
      id,
      artista_id: req.body?.artista_id || req.user?.id || null,
      titulo: req.body?.titulo || 'Sem título',
      nome_artista: req.body?.nome_artista || null,
      estilo: req.body?.estilo || null,
      cover_url: req.body?.cover_url || null,
      audio_url: req.body?.audio_url || null,
      authorization_url: req.body?.authorization_url || null,
      plataformas: req.body?.plataformas || ['Todas'],
      status: req.body?.status || 'pendente',
      isrc: req.body?.isrc || null,
      has_feat: !!req.body?.has_feat,
      feat_name: req.body?.feat_name || null,
      composer: req.body?.composer || null,
      producer: req.body?.producer || null,
      feat_beatwap_artist_ids: Array.isArray(req.body?.feat_beatwap_artist_ids) ? req.body.feat_beatwap_artist_ids : [],
      is_beatwap_composer_partner: !!req.body?.is_beatwap_composer_partner,
      composer_partner_id: req.body?.composer_partner_id || null,
      album_id: req.body?.album_id || null,
      album_title: req.body?.album_title || null,
      created_at: new Date().toISOString(),
    };
    memory.musics.unshift(item);
    scheduleSave();
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});
router.post('/musics/batch', auth, async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.musics) ? req.body.musics : [];
    const inserted = rows.map((r) => ({
      id: `music_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      ...r,
      created_at: new Date().toISOString(),
    }));
    memory.musics.unshift(...inserted);
    scheduleSave();
    res.json({ ok: true, inserted });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update music fields/status
router.put('/admin/musics/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const idx = memory.musics.findIndex(m => m.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Música não encontrada' });
    const patch = {};
    const allowed = [
      'status','upc','presave_link','release_date','is_beatwap_produced','produced_by','producer_id','show_on_home','isrc','composer_partner_id',
      'titulo','nome_artista','estilo','cover_url','audio_url','authorization_url'
    ];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) patch[k] = req.body[k];
    }
    memory.musics[idx] = { ...memory.musics[idx], ...patch, updated_at: new Date().toISOString() };
    scheduleSave();
    emitEvent('musics.updated', { id, item: memory.musics[idx] }, `music:${id}`);
    res.json({ ok: true, item: memory.musics[idx] });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Alias to support clients calling /musics/:id
router.put('/musics/:id', auth, async (req, res) => {
  req.url = `/admin/musics/${req.params.id}`;
  return router.handle(req, res);
});

// Delete music
router.delete('/admin/musics/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const idx = memory.musics.findIndex(m => m.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Música não encontrada' });
    
    const deletedMusic = memory.musics.splice(idx, 1)[0];
    scheduleSave();
    emitEvent('musics.deleted', { id, item: deletedMusic }, `music:${id}`);
    res.json({ ok: true, message: 'Música apagada com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Toggle like for a music
router.post('/musics/:id/like', async (req, res) => {
  try {
    const id = req.params.id;
    const ipHash = String(req.body?.ip_hash || '').trim() || 'unknown';
    if (!memory.likes) memory.likes = {};
    const arr = Array.isArray(memory.likes[id]) ? memory.likes[id] : [];
    const idx = arr.indexOf(ipHash);
    let liked = false;
    if (idx >= 0) {
      arr.splice(idx, 1);
      liked = false;
    } else {
      arr.push(ipHash);
      liked = true;
    }
    memory.likes[id] = arr;
    scheduleSave();
    emitEvent('musics.likes.updated', { id, likes: arr.length }, `music:${id}`);
    res.json({ liked, likes: arr.length });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update access control for a profile (multiple aliases supported)
const { emitEvent } = require('../realtime');

async function updateAccessControlById(id, data, res) {
  try {
    const payload = data?.access_control && typeof data.access_control === 'object'
      ? data.access_control
      : data;
    await Profile.update({ access_control: payload }, { where: { id } });
    const user = await Profile.findByPk(id);
    emitEvent('profiles.access_control.updated', { id, access_control: user?.access_control || null }, `profile:${id}`);
    return res.json({ ok: true, profile: user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
}

router.put('/profiles/:id/access-control', auth, async (req, res) => {
  if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
  return updateAccessControlById(req.params.id, req.body, res);
});
router.put('/profiles/:id/access_control', auth, async (req, res) => {
  if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
  return updateAccessControlById(req.params.id, req.body, res);
});
router.put('/profiles/:id/accesscontrol', auth, async (req, res) => {
  if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
  return updateAccessControlById(req.params.id, req.body, res);
});

async function getHitAdmin(req, res) {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.json(null);
    res.json(hit);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function putHitAdmin(req, res) {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.status(400).json({ error: 'Desafio indisponível' });

    const theme = Object.prototype.hasOwnProperty.call(req.body, 'theme') ? String(req.body.theme || '').trim() : null;
    const starts_at = Object.prototype.hasOwnProperty.call(req.body, 'starts_at') ? (req.body.starts_at || null) : null;
    const ends_at = Object.prototype.hasOwnProperty.call(req.body, 'ends_at') ? (req.body.ends_at || null) : null;
    const entry_fee = Object.prototype.hasOwnProperty.call(req.body, 'entry_fee') ? Number(req.body.entry_fee) : null;

    if (theme !== null) hit.theme = theme || hit.theme;
    if (starts_at !== null) hit.starts_at = starts_at;
    if (ends_at !== null) hit.ends_at = ends_at;
    if (entry_fee !== null && Number.isFinite(entry_fee) && entry_fee >= 0) hit.entry_fee = entry_fee;

    hit.updated_at = new Date().toISOString();
    scheduleSave();
    emitEvent('hit_of_week.updated', { hit }, 'public:hit_of_week');
    res.json({ ok: true, hit });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function markHitEntryPaid(req, res) {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit || !Array.isArray(hit.entries)) return res.status(400).json({ error: 'Desafio indisponível' });
    const entryId = String(req.params.entryId || '').trim();
    const paid = req.body?.paid === false ? false : true;
    const idx = hit.entries.findIndex(e => String(e?.id || '') === entryId);
    if (idx < 0) return res.status(404).json({ error: 'Inscrição não encontrada' });
    hit.entries[idx].paid = paid;
    hit.updated_at = new Date().toISOString();
    scheduleSave();
    emitEvent('hit_of_week.entry.updated', { entry: hit.entries[idx] }, 'public:hit_of_week');
    res.json({ ok: true, entry: hit.entries[idx] });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function setHitWinner(req, res) {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const hit = memory.hit_of_week && typeof memory.hit_of_week === 'object' ? memory.hit_of_week : null;
    if (!hit) return res.status(400).json({ error: 'Desafio indisponível' });
    const winner_entry_id = String(req.body?.winner_entry_id || '').trim() || null;
    hit.winner_entry_id = winner_entry_id;
    hit.updated_at = new Date().toISOString();
    scheduleSave();
    emitEvent('hit_of_week.winner.updated', { winner_entry_id }, 'public:hit_of_week');
    res.json({ ok: true, hit });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function getFeaturedPlansAdmin(req, res) {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const fp = memory.featured_plans && typeof memory.featured_plans === 'object' ? memory.featured_plans : null;
    res.json(fp);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function putFeaturedPlansAdmin(req, res) {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const fp = memory.featured_plans && typeof memory.featured_plans === 'object' ? memory.featured_plans : null;
    if (!fp) return res.status(400).json({ error: 'Configuração indisponível' });
    if (Object.prototype.hasOwnProperty.call(req.body, 'cta')) {
      fp.cta = String(req.body.cta || '').trim() || fp.cta;
    }
    const inputPlans = req.body?.plans && typeof req.body.plans === 'object' ? req.body.plans : null;
    if (inputPlans) {
      Object.keys(fp.plans || {}).forEach((k) => {
        if (!Object.prototype.hasOwnProperty.call(inputPlans, k)) return;
        const pIn = inputPlans[k];
        if (!pIn || typeof pIn !== 'object') return;
        if (Object.prototype.hasOwnProperty.call(pIn, 'label')) fp.plans[k].label = String(pIn.label || '').trim() || fp.plans[k].label;
        if (Object.prototype.hasOwnProperty.call(pIn, 'price')) {
          const price = Number(pIn.price);
          if (Number.isFinite(price) && price >= 0) fp.plans[k].price = price;
        }
        if (Object.prototype.hasOwnProperty.call(pIn, 'duration_hours')) {
          const dh = Number(pIn.duration_hours);
          if (Number.isFinite(dh) && dh >= 0) fp.plans[k].duration_hours = dh;
        }
        if (Object.prototype.hasOwnProperty.call(pIn, 'pinned')) fp.plans[k].pinned = pIn.pinned === true;
      });
    }
    fp.updated_at = new Date().toISOString();
    scheduleSave();
    emitEvent('featured_plans.updated', { featured_plans: fp }, 'public:featured_plans');
    res.json({ ok: true, featured_plans: fp });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function applyFeaturedToProfile(req, res) {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const user = await Profile.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const fp = memory.featured_plans && typeof memory.featured_plans === 'object' ? memory.featured_plans : null;
    const level = String(req.body?.level || '').toLowerCase().trim();
    const now = Date.now();
    const ac = (user.access_control && typeof user.access_control === 'object') ? { ...user.access_control } : {};

    if (!level || level === 'off' || level === 'none' || level === 'remove') {
      ac.featured = { enabled: false, level: null, starts_at: null, ends_at: null, pinned: false };
    } else {
      const plan = fp?.plans?.[level] || null;
      if (!plan) return res.status(400).json({ error: 'Plano de destaque inválido' });
      const hours = Number(plan.duration_hours);
      const ms = Number.isFinite(hours) ? Math.max(0, hours) * 60 * 60 * 1000 : 0;
      const endsAt = ms ? new Date(now + ms).toISOString() : null;
      ac.featured = {
        enabled: true,
        level: plan.level || level,
        starts_at: new Date(now).toISOString(),
        ends_at: endsAt,
        pinned: plan.pinned === true
      };
    }

    await Profile.update({ access_control: ac }, { where: { id } });
    const updated = await Profile.findByPk(id);
    emitEvent('profiles.featured.updated', { id, access_control: updated?.access_control || null }, `profile:${id}`);
    res.json({ ok: true, profile: updated });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

router.get('/admin/hit-of-week', auth, getHitAdmin);
router.get('/admin/hit_of_week', auth, getHitAdmin);
router.get('/hit-of-week', auth, getHitAdmin);
router.get('/hit_of_week', auth, getHitAdmin);

router.put('/admin/hit-of-week', auth, putHitAdmin);
router.put('/admin/hit_of_week', auth, putHitAdmin);
router.put('/hit-of-week', auth, putHitAdmin);
router.put('/hit_of_week', auth, putHitAdmin);

router.post('/admin/hit-of-week/entries/:entryId/mark-paid', auth, markHitEntryPaid);
router.post('/admin/hit_of_week/entries/:entryId/mark-paid', auth, markHitEntryPaid);
router.post('/hit-of-week/entries/:entryId/mark-paid', auth, markHitEntryPaid);
router.post('/hit_of_week/entries/:entryId/mark-paid', auth, markHitEntryPaid);

router.post('/admin/hit-of-week/winner', auth, setHitWinner);
router.post('/admin/hit_of_week/winner', auth, setHitWinner);
router.post('/hit-of-week/winner', auth, setHitWinner);
router.post('/hit_of_week/winner', auth, setHitWinner);

router.get('/admin/featured-plans', auth, getFeaturedPlansAdmin);
router.get('/admin/featured_plans', auth, getFeaturedPlansAdmin);
router.get('/featured-plans', auth, getFeaturedPlansAdmin);
router.get('/featured_plans', auth, getFeaturedPlansAdmin);

router.put('/admin/featured-plans', auth, putFeaturedPlansAdmin);
router.put('/admin/featured_plans', auth, putFeaturedPlansAdmin);
router.put('/featured-plans', auth, putFeaturedPlansAdmin);
router.put('/featured_plans', auth, putFeaturedPlansAdmin);

router.post('/admin/profiles/:id/featured', auth, applyFeaturedToProfile);
router.post('/profiles/:id/featured', auth, applyFeaturedToProfile);
router.post('/admin/profile/:id/featured', auth, applyFeaturedToProfile);
router.post('/profile/:id/featured', auth, applyFeaturedToProfile);

// Purge user account (requires confirmation string)
router.post('/admin/users/:id/purge', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const id = req.params.id;
    const user = await Profile.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const confirm = String(req.body?.confirm || '');
    const expected = `APAGAR ${user.email}`;
    if (confirm !== expected) return res.status(400).json({ error: 'Confirmação inválida' });
    await user.destroy();
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Update artist profile by id (admin/produtor)
router.put('/admin/profiles/:id', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const allowed = [
      'nome','email','bio','genero_musical',
      'youtube_url','spotify_url','deezer_url','tiktok_url','instagram_url','site_url',
      'avatar_url'
    ];
    const patch = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        patch[k] = req.body[k];
      }
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
    await Profile.update(patch, { where: { id } });
    const profile = await Profile.findByPk(id);
    return res.json({ ok: true, profile });
  } catch (e) {
    console.error('[PUT /admin/profiles/:id] failed', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Sponsors CRUD (in-memory)
router.post('/sponsors', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
    const item = {
      id: `sponsor_${Date.now()}`,
      name,
      instagram_url: req.body?.instagram_url || null,
      site_url: req.body?.site_url || null,
      logo_url: req.body?.logo_data || null,
      active: true,
      created_by: req.body?.created_by || null,
      created_at: new Date().toISOString()
    };
    if (!Array.isArray(memory.sponsors)) memory.sponsors = [];
    memory.sponsors.unshift(item);
    scheduleSave();
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/sponsors/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const idx = Array.isArray(memory.sponsors) ? memory.sponsors.findIndex(s => s.id === id) : -1;
    if (idx < 0) return res.status(404).json({ error: 'Patrocinador não encontrado' });
    const allowed = ['name','instagram_url','site_url','logo_url','active'];
    const patch = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) patch[k] = req.body[k];
    }
    memory.sponsors[idx] = { ...memory.sponsors[idx], ...patch, updated_at: new Date().toISOString() };
    scheduleSave();
    res.json({ ok: true, item: memory.sponsors[idx] });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/sponsors/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    memory.sponsors = Array.isArray(memory.sponsors) ? memory.sponsors.filter(s => s.id !== id) : [];
    scheduleSave();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
