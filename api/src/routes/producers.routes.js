const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/producers.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getAll);

module.exports = router;
