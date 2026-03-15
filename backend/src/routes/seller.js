const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { Profile, Proposal, Lead } = require('../models');

const router = express.Router();

router.get('/artists', authRequired, requireRole('Vendedor'), async (req, res) => {
  const artists = await Profile.findAll({ where: { cargo: 'Artista' }, limit: 50 });
  return res.json({ ok: true, artists });
});

router.get('/leads', authRequired, requireRole('Vendedor'), async (req, res) => {
  const leads = await Lead.findAll({ where: { seller_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json({ ok: true, leads });
});

router.get('/finance', authRequired, requireRole('Vendedor'), async (req, res) => {
  return res.json({ ok: true, total: 0 });
});

router.get('/proposals', authRequired, requireRole('Vendedor'), async (req, res) => {
  const rows = await Proposal.findAll({ where: { seller_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json({ ok: true, rows });
});

router.get('/communications', authRequired, requireRole('Vendedor'), async (req, res) => {
  return res.json({ ok: true, messages: [] });
});

module.exports = router;
