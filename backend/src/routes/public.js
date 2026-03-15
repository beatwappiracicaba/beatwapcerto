const express = require('express');
const { Profile, Album, Music, Composition, Release, PublicEvent } = require('../models');

const router = express.Router();

router.get('/', async (req, res) => {
  const releases = await Release.findAll({ limit: 10, order: [['created_at', 'DESC']] });
  return res.json({ ok: true, releases });
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
  return res.json({ ok: true, events });
});

module.exports = router;
