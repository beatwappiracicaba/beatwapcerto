const express = require('express');
const { authRequired } = require('../middleware/auth');
const { Notification } = require('../models');

const router = express.Router();

router.get('/:id', authRequired, async (req, res) => {
  const rows = await Notification.findAll({ where: { user_id: req.user.sub }, order: [['created_at', 'DESC']], limit: 50 });
  return res.json({ ok: true, rows });
});

module.exports = router;
