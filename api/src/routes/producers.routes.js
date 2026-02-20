const express = require('express');
const router = express.Router();
const producersController = require('../controllers/producers.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, producersController.getAll);

module.exports = router;
