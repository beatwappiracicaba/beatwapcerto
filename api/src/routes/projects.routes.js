const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Rota para buscar todos os projetos
router.get('/', protect, (req, res) => {
  res.status(200).send('Projects endpoint');
});

module.exports = router;