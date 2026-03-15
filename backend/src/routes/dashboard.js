const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { Music, Composition, Profile } = require('../models');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const cargo = String(req.user.cargo);
  return res.json({ ok: true, redirect: cargo });
});

router.get('/musics', authRequired, requireRole(['Artista', 'Compositor']), async (req, res) => {
  const rows = await Music.findAll({ where: { profile_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json({ ok: true, rows });
});

router.get('/compositions', authRequired, requireRole(['Artista', 'Compositor']), async (req, res) => {
  const rows = await Composition.findAll({ where: { profile_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json({ ok: true, rows });
});

router.get('/profile', authRequired, async (req, res) => {
  const profile = await Profile.findByPk(String(req.user.sub));
  return res.json({ ok: true, profile });
});

module.exports = router;
