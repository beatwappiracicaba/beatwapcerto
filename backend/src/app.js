const path = require('path');
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/error');
const { apiRouter } = require('./apiRouter');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('etag', false);
  app.set('trust proxy', 1);

  app.use(cors({ origin: true, credentials: true }));
  app.options('*', cors());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api', (req, res, next) => {
    const hasAuth = !!(req.headers.authorization || req.headers.Authorization);
    res.setHeader('Vary', 'Origin, Authorization');
    if (hasAuth) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });
  app.use('/api', apiRouter);
  app.use(apiRouter);

  app.use((req, res) => res.status(404).json({ success: false, error: 'Não encontrado' }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
