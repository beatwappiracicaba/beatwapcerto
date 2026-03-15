const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { Profile, Music, Composition, Sponsor } = require('../models');

const router = express.Router();
const adminOnly = [authRequired, requireRole('Produtor')];

router.get('/profile', adminOnly, async (req, res) => {
  const profile = await Profile.findByPk(String(req.user.sub));
  return res.json({ ok: true, profile });
});

router.get('/artists', adminOnly, async (req, res) => {
  const artists = await Profile.findAll({ where: { cargo: 'Artista' }, limit: 200 });
  return res.json({ ok: true, artists });
});

router.get('/composers', adminOnly, async (req, res) => {
  const rows = await Profile.findAll({ where: { cargo: 'Compositor' }, limit: 200 });
  return res.json({ ok: true, rows });
});

router.get('/sellers', adminOnly, async (req, res) => {
  const rows = await Profile.findAll({ where: { cargo: 'Vendedor' }, limit: 200 });
  return res.json({ ok: true, rows });
});

router.get('/finance', adminOnly, async (req, res) => {
  return res.json({ ok: true, total: 0 });
});

router.get('/musics', adminOnly, async (req, res) => {
  const rows = await Music.findAll({ order: [['created_at', 'DESC']], limit: 200 });
  return res.json({ ok: true, rows });
});

router.get('/compositions', adminOnly, async (req, res) => {
  const rows = await Composition.findAll({ order: [['created_at', 'DESC']], limit: 200 });
  return res.json({ ok: true, rows });
});

router.get('/chat', adminOnly, async (req, res) => {
  return res.json({ ok: true });
});

router.get('/sponsors', adminOnly, async (req, res) => {
  const rows = await Sponsor.findAll({ order: [['created_at', 'DESC']] });
  return res.json({ ok: true, rows });
});

router.get('/settings', adminOnly, async (req, res) => {
  return res.json({ ok: true, settings: {} });
});

module.exports = router;
