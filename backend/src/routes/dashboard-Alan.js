const express = require('express');
const { auth } = require('../middleware/auth');
const { Profile, PaymentOrder } = require('../models');
const { memory, scheduleSave } = require('../memoryStore');
const { emitEvent } = require('../realtime');

const router = express.Router();

function normId(v) {
  return String(v || '').trim();
}

function getFollowingIds(followerId) {
  const key = normId(followerId);
  const arr = memory.follows && typeof memory.follows === 'object' ? memory.follows[key] : null;
  if (Array.isArray(arr)) return arr.map(normId).filter(Boolean);
  if (arr && typeof arr === 'object') return Object.keys(arr).map(normId).filter(Boolean);
  return [];
}

function setFollowingIds(followerId, ids) {
  const key = normId(followerId);
  if (!memory.follows || typeof memory.follows !== 'object') memory.follows = {};
  memory.follows[key] = Array.isArray(ids) ? ids.map(normId).filter(Boolean) : [];
  scheduleSave();
}

function countFollowers(targetId) {
  const tid = normId(targetId);
  if (!tid) return 0;
  const follows = memory.follows && typeof memory.follows === 'object' ? memory.follows : {};
  let n = 0;
  for (const followerId of Object.keys(follows)) {
    const arr = follows[followerId];
    if (Array.isArray(arr)) {
      if (arr.some((x) => normId(x) === tid)) n += 1;
      continue;
    }
    if (arr && typeof arr === 'object') {
      if (Object.prototype.hasOwnProperty.call(arr, tid)) n += 1;
    }
  }
  return n;
}

function isMusicApproved(m) {
  const s = String(m?.status || '').toLowerCase().trim();
  return s === 'aprovado' || s === 'aprovada' || s === 'approved' || s === 'aceito' || s === 'aceita';
}

function isMusicApprovedStrictPt(m) {
  const s = String(m?.status || '').toLowerCase().trim();
  return s === 'aprovado' || s === 'aprovada' || s === 'approved';
}

router.get('/dashboard/profile', auth, async (req, res) => {
  try {
    const user = await Profile.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json({
      id: user.id,
      email: user.email,
      cargo: user.cargo,
      status: user.status,
      nome: user.nome,
      nome_completo: user.nome_completo,
      razao_social: user.razao_social,
      nome_completo_razao_social: user.nome_completo_razao_social,
      avatar_url: user.avatar_url,
      bio: user.bio,
      genero_musical: user.genero_musical,
      youtube_url: user.youtube_url,
      spotify_url: user.spotify_url,
      deezer_url: user.deezer_url,
      tiktok_url: user.tiktok_url,
      instagram_url: user.instagram_url,
      site_url: user.site_url,
      cpf_cnpj: user.cpf_cnpj,
      cpf: user.cpf,
      cnpj: user.cnpj,
      celular: user.celular,
      telefone: user.telefone,
      tema: user.tema,
      cep: user.cep,
      logradouro: user.logradouro,
      complemento: user.complemento,
      bairro: user.bairro,
      cidade: user.cidade,
      estado: user.estado,
      plano: user.plano,
      creditos_envio: user.creditos_envio,
      creditos_hit_semana: user.creditos_hit_semana,
      referred_by: user.referred_by,
      contract_accepted_at: user.contract_accepted_at,
      email_verified: user.email_verified,
      access_control: user.access_control || null
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Alias GET /profile to match client expectations
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await Profile.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json({
      id: user.id,
      email: user.email,
      cargo: user.cargo,
      status: user.status,
      nome: user.nome,
      nome_completo: user.nome_completo,
      razao_social: user.razao_social,
      nome_completo_razao_social: user.nome_completo_razao_social,
      avatar_url: user.avatar_url,
      bio: user.bio,
      genero_musical: user.genero_musical,
      youtube_url: user.youtube_url,
      spotify_url: user.spotify_url,
      deezer_url: user.deezer_url,
      tiktok_url: user.tiktok_url,
      instagram_url: user.instagram_url,
      site_url: user.site_url,
      cpf_cnpj: user.cpf_cnpj,
      cpf: user.cpf,
      cnpj: user.cnpj,
      celular: user.celular,
      telefone: user.telefone,
      tema: user.tema,
      cep: user.cep,
      logradouro: user.logradouro,
      complemento: user.complemento,
      bairro: user.bairro,
      cidade: user.cidade,
      estado: user.estado,
      plano: user.plano,
      creditos_envio: user.creditos_envio,
      creditos_hit_semana: user.creditos_hit_semana,
      referred_by: user.referred_by,
      contract_accepted_at: user.contract_accepted_at,
      email_verified: user.email_verified,
      access_control: user.access_control || null
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update profile basic fields
router.put('/profile', auth, async (req, res) => {
  try {
    const existing = await Profile.findByPk(req.user.id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Perfil não encontrado' });
    const allowed = [
      'nome','bio','genero_musical',
      'youtube_url','spotify_url','deezer_url','tiktok_url','instagram_url','site_url',
      'avatar_url','email',
      'nome_completo_razao_social','cpf_cnpj','celular','tema',
      'nome_completo','razao_social','cpf','cnpj','telefone',
      'cep','logradouro','complemento','bairro','cidade','estado'
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body.hasOwnProperty(k)) patch[k] = req.body[k];
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'nome_completo') || Object.prototype.hasOwnProperty.call(patch, 'razao_social')) {
      const nomeCompleto = Object.prototype.hasOwnProperty.call(patch, 'nome_completo') ? patch.nome_completo : existing.nome_completo;
      const razaoSocial = Object.prototype.hasOwnProperty.call(patch, 'razao_social') ? patch.razao_social : existing.razao_social;
      const a = String(nomeCompleto || '').trim();
      const b = String(razaoSocial || '').trim();
      patch.nome_completo_razao_social = (a && b) ? `${a} / ${b}` : (a || b || null);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'cpf') || Object.prototype.hasOwnProperty.call(patch, 'cnpj')) {
      const cpf = Object.prototype.hasOwnProperty.call(patch, 'cpf') ? patch.cpf : existing.cpf;
      const cnpj = Object.prototype.hasOwnProperty.call(patch, 'cnpj') ? patch.cnpj : existing.cnpj;
      const a = String(cpf || '').trim();
      const b = String(cnpj || '').trim();
      patch.cpf_cnpj = (a && b) ? `${a} / ${b}` : (a || b || null);
    }
    console.log('[PUT /profile]', { userId: req.user.id, keys: Object.keys(patch) });
    await Profile.update(patch, { where: { id: req.user.id } });
    const user = await Profile.findByPk(req.user.id);
    res.json({ ok: true, profile: user });
  } catch (e) {
    console.error('[PUT /profile] failed', e);
    res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/profile/cancel-plan', auth, async (req, res) => {
  try {
    const existing = await Profile.findByPk(req.user.id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Perfil não encontrado' });
    const plan = String(existing.plano || '').toLowerCase().trim();
    const canCancel = plan.includes('mensal') || plan.includes('anual');
    if (!canCancel) return res.status(400).json({ ok: false, error: 'Nenhum plano ativo para cancelar' });

    existing.plano = 'Avulso';
    existing.plan_started_at = null;
    await existing.save();

    try { emitEvent('profile.updated', { id: existing.id }, `profile:${existing.id}`); } catch { void 0; }
    return res.json({ ok: true, profile: existing });
  } catch (e) {
    console.error('[POST /profile/cancel-plan] failed', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.get('/payment/orders/:external_reference', auth, async (req, res) => {
  try {
    const external_reference = String(req.params.external_reference || '').trim();
    if (!external_reference) return res.status(400).json({ ok: false, error: 'Referência inválida' });

    const order = await PaymentOrder.findOne({ where: { external_reference, profile_id: req.user.id } });
    if (!order) return res.status(404).json({ ok: false, error: 'Pedido não encontrado' });

    return res.json({
      ok: true,
      order: {
        id: order.id,
        external_reference: order.external_reference,
        status: order.status,
        product_type: order.product_type,
        product_key: order.product_key,
        quantity: order.quantity,
        amount_cents: order.amount_cents,
        currency: order.currency,
        access_granted_at: order.access_granted_at,
        mp_payment_id: order.mp_payment_id,
        mp_payment_status: order.mp_payment_status,
        mp_payment_status_detail: order.mp_payment_status_detail
      }
    });
  } catch (e) {
    console.error('[GET /payment/orders/:external_reference] failed', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

// Upload avatar (store dataUrl as avatar_url for mock)
router.post('/profile/avatar', auth, async (req, res) => {
  try {
    const dataUrl = String(req.body?.dataUrl || '');
    if (!dataUrl.startsWith('data:image')) return res.status(400).json({ error: 'Formato inválido' });
    await Profile.update({ avatar_url: dataUrl }, { where: { id: req.user.id } });
    res.json({ ok: true, avatar_url: dataUrl });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/admin/settings', auth, (req, res) => {
  if (req.user.cargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
  res.json({ settings: { p_admin_finance: true } });
});

router.get('/seller/dashboard', auth, (req, res) => {
  if (req.user.cargo !== 'Vendedor') return res.status(403).json({ error: 'Sem permissão' });
  res.json({ leads_today: 0, proposals: 0 });
});

router.get('/follow/status/:id', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    const targetId = normId(req.params.id);
    if (!targetId) return res.status(400).json({ error: 'ID inválido' });

    const myFollowing = getFollowingIds(meId);
    const following = targetId !== meId && myFollowing.includes(targetId);

    res.json({
      me: {
        id: meId,
        following_count: myFollowing.length,
        followers_count: countFollowers(meId)
      },
      target: {
        id: targetId,
        following,
        following_count: getFollowingIds(targetId).length,
        followers_count: countFollowers(targetId)
      }
    });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/follow/:id', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    const targetId = normId(req.params.id);
    if (!targetId) return res.status(400).json({ error: 'ID inválido' });
    if (targetId === meId) return res.status(400).json({ error: 'Você não pode seguir a si mesmo' });

    const action = String(req.body?.action || '').toLowerCase().trim();
    const list = getFollowingIds(meId);
    const exists = list.includes(targetId);

    let next = list.slice();
    if (action === 'unfollow') {
      next = next.filter((x) => x !== targetId);
    } else if (action === 'follow') {
      if (!exists) next = [targetId, ...next];
    } else {
      next = exists ? next.filter((x) => x !== targetId) : [targetId, ...next];
    }

    setFollowingIds(meId, next);
    res.json({ following: next.includes(targetId) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/follow/following', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    const ids = getFollowingIds(meId);
    let profiles = [];
    try {
      if (ids.length) {
        const rows = await Profile.findAll({ where: { id: ids } });
        profiles = Array.isArray(rows) ? rows : [];
      }
    } catch {
      profiles = [];
    }
    res.json({ ids, profiles });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/follow/followers', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    const follows = memory.follows && typeof memory.follows === 'object' ? memory.follows : {};
    const ids = [];
    for (const followerId of Object.keys(follows)) {
      const arr = follows[followerId];
      if (Array.isArray(arr)) {
        if (arr.some((x) => normId(x) === meId)) ids.push(normId(followerId));
        continue;
      }
      if (arr && typeof arr === 'object') {
        if (Object.prototype.hasOwnProperty.call(arr, meId)) ids.push(normId(followerId));
      }
    }
    let profiles = [];
    try {
      if (ids.length) {
        const rows = await Profile.findAll({ where: { id: ids } });
        profiles = Array.isArray(rows) ? rows : [];
      }
    } catch {
      profiles = [];
    }
    res.json({ ids, profiles });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/feed/posts', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });

    const allowed = new Set(['text', 'image', 'video', 'link']);
    const media_type = String(req.body?.media_type || 'text').toLowerCase().trim();
    if (!allowed.has(media_type)) return res.status(400).json({ error: 'Tipo inválido' });

    const caption = String(req.body?.caption || '').trim();
    const link_url = String(req.body?.link_url || '').trim() || null;
    let media_url = String(req.body?.media_url || '').trim() || null;
    const format = String(req.body?.format || '').toLowerCase().trim() || null;
    const object_position = req.body?.object_position && typeof req.body.object_position === 'object' ? req.body.object_position : null;

    if (media_type === 'link' && link_url) {
      const safe = String(link_url || '').replace(/[`"'<>]/g, '').trim();
      const m = safe.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/i);
      const vid = m && m[2] && m[2].length === 11 ? m[2] : null;
      if (vid) media_url = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
    }

    if (media_type === 'text') {
      media_url = null;
    }

    if (media_type === 'image' && (!media_url || media_url === '')) {
      media_url = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2236%22 font-family=%22Arial%22>Imagem indisponível</text></svg>';
    }

    const id = `post_${Date.now()}`;
    const item = {
      id,
      user_id: meId,
      media_url,
      media_type,
      link_url,
      caption,
      format,
      object_position,
      scope: 'feed',
      created_at: new Date().toISOString()
    };

    if (!Array.isArray(memory.posts)) memory.posts = [];
    memory.posts.unshift(item);
    scheduleSave();
    emitEvent('posts.created', item, `profile:${meId}`);

    const arr = Array.isArray(memory.likes && memory.likes[id]) ? memory.likes[id] : [];
    res.json({ ...item, likes_count: arr.length });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/feed/posts/:id/like', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });
    const id = String(req.params.id || '').trim();
    const existsIdx = (memory.posts || []).findIndex(p => String(p?.id || '') === id);
    if (existsIdx < 0) return res.status(404).json({ error: 'Post não encontrado' });

    const arr = Array.isArray(memory.likes && memory.likes[id]) ? memory.likes[id] : [];
    const exists = arr.includes(meId);
    const next = exists ? arr.filter(x => x !== meId) : arr.concat(meId);
    memory.likes[id] = next;
    scheduleSave();
    emitEvent('posts.likes.updated', { id, likes: next.length }, `profile:${meId}`);
    res.json({ liked: !exists, likes: next.length });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/feed/posts/:id/likes', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });
    const id = String(req.params.id || '').trim();
    const arr = Array.isArray(memory.likes && memory.likes[id]) ? memory.likes[id] : [];
    res.json({ likes: arr.length, liked: arr.includes(meId) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/feed/posts/:id/comments', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });
    const id = String(req.params.id || '').trim();
    const existsIdx = (memory.posts || []).findIndex(p => String(p?.id || '') === id);
    if (existsIdx < 0) return res.status(404).json({ error: 'Post não encontrado' });

    const list = Array.isArray(memory.comments && memory.comments[id]) ? memory.comments[id] : [];
    const userIds = Array.from(new Set(list.map(c => normId(c?.user_id)).filter(Boolean)));
    let profilesById = new Map();
    try {
      if (userIds.length) {
        const rows = await Profile.findAll({ where: { id: userIds } });
        profilesById = new Map((rows || []).map((r) => [normId(r.id), r]));
      }
    } catch {
      profilesById = new Map();
    }
    const mapped = list
      .slice()
      .sort((a, b) => String(a?.created_at || '').localeCompare(String(b?.created_at || '')))
      .map((c) => {
        const pid = normId(c?.user_id);
        const p = pid ? profilesById.get(pid) : null;
        return {
          id: c?.id,
          post_id: id,
          user_id: pid,
          text: c?.text || '',
          created_at: c?.created_at,
          owner: p ? { id: p.id, nome: p.nome, nome_completo_razao_social: p.nome_completo_razao_social, cargo: p.cargo, avatar_url: p.avatar_url } : { id: pid, nome: null, nome_completo_razao_social: null, cargo: null, avatar_url: null }
        };
      });
    res.json({ comments: mapped });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/feed/posts/:id/comments', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });
    const id = String(req.params.id || '').trim();
    const existsIdx = (memory.posts || []).findIndex(p => String(p?.id || '') === id);
    if (existsIdx < 0) return res.status(404).json({ error: 'Post não encontrado' });

    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Comentário vazio' });
    if (text.length > 600) return res.status(400).json({ error: 'Comentário muito longo' });

    const comment = { id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, post_id: id, user_id: meId, text, created_at: new Date().toISOString() };
    if (!memory.comments || typeof memory.comments !== 'object') memory.comments = {};
    const arr = Array.isArray(memory.comments[id]) ? memory.comments[id] : [];
    arr.push(comment);
    memory.comments[id] = arr;
    scheduleSave();
    emitEvent('posts.comments.created', { post_id: id }, `profile:${meId}`);

    const p = await Profile.findByPk(meId);
    const owner = p ? { id: p.id, nome: p.nome, nome_completo_razao_social: p.nome_completo_razao_social, cargo: p.cargo, avatar_url: p.avatar_url } : { id: meId, nome: null, nome_completo_razao_social: null, cargo: null, avatar_url: null };
    res.json({ comment: { ...comment, owner } });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/feed', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    const limit = Math.min(50, Math.max(5, Number(req.query?.limit || 20)));
    const cursorRaw = String(req.query?.cursor || '').trim();

    const followingIds = getFollowingIds(meId);
    const followingSet = new Set(followingIds);

    const parseCursor = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return null;
      const parts = s.split('|');
      if (parts.length < 2) return null;
      const ts = new Date(parts[0]).getTime();
      if (!Number.isFinite(ts)) return null;
      const id = String(parts.slice(1).join('|'));
      return { ts, id };
    };

    const cursor = parseCursor(cursorRaw);

    const entries = [];

    for (const p of (memory.posts || [])) {
      const ownerId = normId(p?.user_id);
      if (!ownerId) continue;
      if (ownerId !== meId && !followingSet.has(ownerId)) continue;
      const createdAt = String(p?.created_at || '');
      const ts = new Date(createdAt).getTime();
      if (!Number.isFinite(ts)) continue;
      entries.push({ type: 'post', id: String(p.id), owner_id: ownerId, created_at: createdAt, ts, data: p });
    }

    for (const c of (memory.compositions || [])) {
      const status = String(c?.status || '').toLowerCase().trim();
      if (status !== 'approved') continue;
      const createdAt = String(c?.created_at || '');
      const ts = new Date(createdAt).getTime();
      if (!Number.isFinite(ts)) continue;

      const composerId = normId(c?.composer_id);
      const producerId = normId(c?.producer_id);

      if (composerId && followingSet.has(composerId)) {
        entries.push({ type: 'composition', id: String(c.id), owner_id: composerId, created_at: createdAt, ts, data: c });
      }
      if (producerId && followingSet.has(producerId) && producerId !== composerId) {
        entries.push({ type: 'composition', id: String(c.id), owner_id: producerId, created_at: createdAt, ts, data: c });
      }
    }

    for (const m of (memory.musics || [])) {
      const createdAt = String(m?.created_at || '');
      const ts = new Date(createdAt).getTime();
      if (!Number.isFinite(ts)) continue;

      const artistaId = normId(m?.artista_id);
      if (artistaId && followingSet.has(artistaId) && isMusicApproved(m)) {
        entries.push({ type: 'music', id: String(m.id), owner_id: artistaId, created_at: createdAt, ts, data: m });
      }

      const producerId = normId(m?.producer_id);
      const beatwapProduced = m?.is_beatwap_produced === true || String(m?.produced_by || '').toLowerCase() === 'beatwap';
      if (producerId && followingSet.has(producerId) && beatwapProduced && isMusicApprovedStrictPt(m)) {
        entries.push({ type: 'music', id: String(m.id), owner_id: producerId, created_at: createdAt, ts, data: m });
      }

      const composerPartnerId = normId(m?.composer_partner_id);
      if (composerPartnerId && followingSet.has(composerPartnerId) && beatwapProduced && isMusicApprovedStrictPt(m)) {
        entries.push({ type: 'music', id: String(m.id), owner_id: composerPartnerId, created_at: createdAt, ts, data: m });
      }
    }

    entries.sort((a, b) => (b.ts - a.ts) || String(b.id).localeCompare(String(a.id)));

    const filtered = cursor
      ? entries.filter((e) => (e.ts < cursor.ts) || (e.ts === cursor.ts && String(e.id).localeCompare(String(cursor.id)) < 0))
      : entries;

    const page = filtered.slice(0, limit);

    const ownerIds = Array.from(new Set(page.map((e) => e.owner_id)));
    const composerIds = Array.from(
      new Set(
        page
          .filter((e) => e.type === 'composition')
          .map((e) => normId(e.data?.composer_id))
          .filter(Boolean)
      )
    );

    const profileIdsToFetch = Array.from(new Set(ownerIds.concat(composerIds)));
    let profilesById = new Map();
    try {
      if (profileIdsToFetch.length) {
        const rows = await Profile.findAll({ where: { id: profileIdsToFetch } });
        profilesById = new Map((rows || []).map((r) => [normId(r.id), r]));
      }
    } catch {
      profilesById = new Map();
    }

    const toOwner = (pid) => {
      const p = pid ? profilesById.get(normId(pid)) : null;
      if (!p) return { id: pid || null, nome: null, nome_completo_razao_social: null, cargo: null, avatar_url: null };
      return {
        id: p.id,
        nome: p.nome,
        nome_completo_razao_social: p.nome_completo_razao_social,
        cargo: p.cargo,
        avatar_url: p.avatar_url
      };
    };

    const out = page.map((e) => {
      if (e.type === 'composition') {
        const composerId = normId(e.data?.composer_id);
        const composer = composerId ? profilesById.get(composerId) : null;
        const title = e.data?.title || e.data?.titulo || 'Sem título';
        const composer_name = e.data?.composer_name || e.data?.author_name || composer?.nome || composer?.nome_completo_razao_social || null;
        const composer_phone = e.data?.composer_phone || composer?.celular || null;
        return {
          type: 'composition',
          id: e.id,
          created_at: e.created_at,
          owner: toOwner(e.owner_id),
          data: {
            ...e.data,
            title,
            titulo: title,
            composer_id: composerId || null,
            composer_name,
            composer_phone
          }
        };
      }
      if (e.type === 'music') {
        return {
          type: 'music',
          id: e.id,
          created_at: e.created_at,
          owner: toOwner(e.owner_id),
          data: e.data
        };
      }
      if (e.type === 'post') {
        const arr = Array.isArray(memory.likes && memory.likes[e.id]) ? memory.likes[e.id] : [];
        const liked = meId ? arr.includes(meId) : false;
        const commentsArr = Array.isArray(memory.comments && memory.comments[e.id]) ? memory.comments[e.id] : [];
        return {
          type: 'post',
          id: e.id,
          created_at: e.created_at,
          owner: toOwner(e.owner_id),
          data: { ...e.data, likes_count: arr.length, liked, comments_count: commentsArr.length }
        };
      }
      return {
        type: 'post',
        id: e.id,
        created_at: e.created_at,
        owner: toOwner(e.owner_id),
        data: e.data
      };
    });

    const last = page[page.length - 1];
    const nextCursor = last ? `${last.created_at}|${last.id}` : null;

    res.json({
      items: out,
      nextCursor,
      followingCount: followingIds.length,
      followingIds
    });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
