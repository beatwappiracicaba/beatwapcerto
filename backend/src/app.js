const path = require('path');
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/error');
const { apiRouter } = require('./routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const allowedCorsHosts = new Set([
    'www.beatwap.com.br',
    'www.beatwap.com',
    'beatwapcerto.pages.dev',
  ]);
  app.use(cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      try {
        const url = new URL(origin);
        if (allowedCorsHosts.has(url.hostname)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      } catch {
        return cb(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter);
  app.use(apiRouter);

  app.use((req, res) => res.status(404).json({ success: false, error: 'Não encontrado' }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
