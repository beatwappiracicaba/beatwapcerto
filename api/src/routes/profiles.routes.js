const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Rota para buscar todos os perfis
router.get('/', (req, res) => {
  res.status(200).send('Profiles endpoint');
});

module.exports = router;