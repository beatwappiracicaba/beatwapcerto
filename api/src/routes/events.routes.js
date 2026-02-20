const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, eventsController.getAll);
router.post('/', authMiddleware, eventsController.create);

module.exports = router;
