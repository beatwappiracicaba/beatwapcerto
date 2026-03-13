const path = require('path');
const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const { errorHandler } = require('./middleware/error');
const { apiRouter } = require('./routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter);

  app.use((req, res) => res.status(404).json({ success: false, error: 'Não encontrado' }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
