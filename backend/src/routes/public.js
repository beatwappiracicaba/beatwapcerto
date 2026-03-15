const express = require('express');
const { Profile, Album, Music, Composition, Release, PublicEvent, Sponsor, Post } = require('../models');

const router = express.Router();

router.get('/home', async (req, res) => {
  const releases = await Release.findAll({ limit: 10, order: [['created_at', 'DESC']] });
  const composers = await Profile.findAll({ where: { cargo: 'Compositor' }, limit: 12, order: [['created_at', 'DESC']] });
  const sponsors = await Sponsor.findAll({ where: { active: true }, limit: 12, order: [['created_at', 'DESC']] });
  return res.json({ ok: true, releases, composers, sponsors });
});

router.get('/releases', async (req, res) => {
  const releases = await Release.findAll({ limit: 20, order: [['created_at', 'DESC']] });
  return res.json(releases);
});

router.get('/compositions', async (req, res) => {
  const compositions = await Composition.findAll({ where: { approved: true }, limit: 20, order: [['created_at', 'DESC']] });
  return res.json(compositions);
});

router.get('/projects', async (req, res) => {
  return res.json([]);
});

router.get('/composers', async (req, res) => {
  const rows = await Profile.findAll({ where: { cargo: 'Compositor' }, limit: 50, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/sponsors', async (req, res) => {
  const rows = await Sponsor.findAll({ where: { active: true }, limit: 50, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/profiles', async (req, res) => {
  const role = String(req.query.role || '').toLowerCase();
  const map = { artist: 'Artista', producer: 'Produtor', seller: 'Vendedor', composer: 'Compositor' };
  const cargo = map[role] || null;
  const where = cargo ? { cargo } : {};
  const rows = await Profile.findAll({ where, limit: 100, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/profiles/:id', async (req, res) => {
  const profile = await Profile.findByPk(String(req.params.id));
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  return res.json(profile);
});

router.get('/profiles/:id/posts', async (req, res) => {
  const profileId = String(req.params.id);
  const profile = await Profile.findByPk(profileId);
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const posts = await Post.findAll({ where: { profile_id: profileId }, limit: 50, order: [['created_at', 'DESC']] });
  return res.json(posts);
});

router.get('/profiles/:id/compositions', async (req, res) => {
  const profileId = String(req.params.id);
  const profile = await Profile.findByPk(profileId);
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const compositions = await Composition.findAll({ where: { profile_id: profileId }, limit: 50, order: [['created_at', 'DESC']] });
  return res.json(compositions);
});

router.get('/profiles/:id/musics', async (req, res) => {
  const profileId = String(req.params.id);
  const profile = await Profile.findByPk(profileId);
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const musics = await Music.findAll({ where: { profile_id: profileId }, limit: 50, order: [['created_at', 'DESC']] });
  return res.json(musics);
});

router.get('/profile/:id', async (req, res) => {
  const profile = await Profile.findByPk(String(req.params.id));
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const musics = await Music.findAll({ where: { profile_id: profile.id }, limit: 20 });
  const compositions = await Composition.findAll({ where: { profile_id: profile.id }, limit: 20 });
  return res.json({ ok: true, profile, musics, compositions });
});

router.get('/album/:id', async (req, res) => {
  const album = await Album.findByPk(String(req.params.id), { include: [Music] });
  if (!album) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  return res.json({ ok: true, album });
});

router.get('/legal/:page', (req, res) => {
  return res.json({ ok: true, page: String(req.params.page) });
});

router.get('/events', async (req, res) => {
  const events = await PublicEvent.findAll({ limit: 20, order: [['event_date', 'DESC']] });
  return res.json(events);
});

router.get('/artists', async (req, res) => {
  const rows = await Profile.findAll({ where: { cargo: 'Artista' }, limit: 100, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/producers', async (req, res) => {
  const rows = await Profile.findAll({ where: { cargo: 'Produtor' }, limit: 100, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/users', async (req, res) => {
  const rows = await Profile.findAll({ limit: 200, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/profiles/:id/events', async (req, res) => {
  const profileId = String(req.params.id);
  const profile = await Profile.findByPk(profileId);
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const rows = await PublicEvent.findAll({ where: { profile_id: profileId }, limit: 50, order: [['event_date', 'DESC']] });
  return res.json(rows);
});

router.get('/profiles/:id/feats', async (req, res) => {
  const profileId = String(req.params.id);
  const profile = await Profile.findByPk(profileId);
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const rows = await Music.findAll({ where: { feat_profile_id: profileId }, limit: 50, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.post('/analytics', async (req, res) => {
  return res.json({ ok: true });
});

router.get('/sellers/:id/stats', async (req, res) => {
  const id = String(req.params.id);
  const profile = await Profile.findByPk(id);
  if (!profile || profile.cargo !== 'Vendedor') return res.status(404).json({ ok: false, error: 'Não encontrado' });
  return res.json({ leads: 0, closed: 0, revenue: 0 });
});

router.get('/profiles/artists/all', async (req, res) => {
  const rows = await Profile.findAll({ where: { cargo: 'Artista' }, limit: 500, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

module.exports = router;
