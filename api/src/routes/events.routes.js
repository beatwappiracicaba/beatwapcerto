const express = require('express');
const router = express.Router();
const { getAll, create } = require('../controllers/events.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getAll);
router.post('/', protect, create);

module.exports = router;
