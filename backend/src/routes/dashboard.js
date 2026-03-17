const express = require('express');
const { auth } = require('../middleware/auth');
const { Profile } = require('../models');

const router = express.Router();

router.get('/dashboard/profile', auth, async (req, res) => {
  try {
    const user = await Profile.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json({
      id: user.id,
      email: user.email,
      cargo: user.cargo,
      nome: user.nome,
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
      celular: user.celular,
      tema: user.tema,
      cep: user.cep,
      logradouro: user.logradouro,
      complemento: user.complemento,
      bairro: user.bairro,
      cidade: user.cidade,
      estado: user.estado,
      plano: user.plano,
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
      nome: user.nome,
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
      celular: user.celular,
      tema: user.tema,
      cep: user.cep,
      logradouro: user.logradouro,
      complemento: user.complemento,
      bairro: user.bairro,
      cidade: user.cidade,
      estado: user.estado,
      plano: user.plano,
      access_control: user.access_control || null
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update profile basic fields
router.put('/profile', auth, async (req, res) => {
  try {
    const allowed = [
      'nome','bio','genero_musical',
      'youtube_url','spotify_url','deezer_url','tiktok_url','instagram_url','site_url',
      'avatar_url','email',
      'nome_completo_razao_social','cpf_cnpj','celular','tema',
      'cep','logradouro','complemento','bairro','cidade','estado','plano'
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body.hasOwnProperty(k)) patch[k] = req.body[k];
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

module.exports = router;
