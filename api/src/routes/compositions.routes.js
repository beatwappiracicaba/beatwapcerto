const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Rota para buscar todas as composições
router.get('/', protect, (req, res) => {
  res.status(200).send('Compositions endpoint');
});

module.exports = router;