const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Rota para buscar todos os patrocinadores
router.get('/', protect, (req, res) => {
  res.status(200).send('Sponsors endpoint');
});

module.exports = router;