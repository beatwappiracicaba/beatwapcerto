const express = require('express');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  return res.json([]);
});

router.post('/', authRequired, async (req, res) => {
  return res.json({ ok: true });
});

module.exports = router;
