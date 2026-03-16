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
    res.json({ liked, likes: arr.length });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update access control for a profile (multiple aliases supported)
async function updateAccessControlById(id, data, res) {
  try {
    const payload = data?.access_control && typeof data.access_control === 'object'
      ? data.access_control
      : data;
    await Profile.update({ access_control: payload }, { where: { id } });
    const user = await Profile.findByPk(id);
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

module.exports = router;
