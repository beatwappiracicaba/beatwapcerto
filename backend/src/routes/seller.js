const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { Profile, Proposal, Lead } = require('../models');

const router = express.Router();

router.get('/artists', authRequired, requireRole('Vendedor'), async (req, res) => {
  const artists = await Profile.findAll({ where: { cargo: 'Artista' }, limit: 100, order: [['created_at', 'DESC']] });
  return res.json(artists);
});

router.get('/leads', authRequired, requireRole('Vendedor'), async (req, res) => {
  const leads = await Lead.findAll({ where: { seller_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json(leads);
});

router.get('/finance', authRequired, requireRole('Vendedor'), async (req, res) => {
  return res.json({ ok: true, total: 0 });
});

router.get('/proposals', authRequired, requireRole('Vendedor'), async (req, res) => {
  const rows = await Proposal.findAll({ where: { seller_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/communications', authRequired, requireRole('Vendedor'), async (req, res) => {
  return res.json({ ok: true, messages: [] });
});

router.get('/contractors', authRequired, requireRole('Vendedor'), async (req, res) => {
  const rows = await Profile.findAll({ where: { cargo: 'Produtor' }, limit: 100, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/leads/:id/history', authRequired, requireRole('Vendedor'), async (req, res) => {
  return res.json([]);
});

module.exports = router;
