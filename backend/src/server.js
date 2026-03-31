const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Op } = require('sequelize');
const { sequelize, Profile } = require('./models');
const { setIO } = require('./realtime');
const { setupSentry, useSentryErrorHandler } = require('./monitoring/sentry');

dotenv.config();

const app = express();
const server = http.createServer(app);
app.set('trust proxy', true);
app.set('etag', false);

const normalizeOrigin = (value) => {
  const s = String(value || '').trim();
  if (!s) return '';
  return s.replace(/^['"`]+|['"`]+$/g, '').replace(/\/+$/g, '');
};

const defaultAllowed = ['https://www.beatwap.com.br', 'https://beatwap.com.br'];
const envAllowed = String(process.env.CORS_ORIGIN || '').split(',').map(normalizeOrigin).filter(Boolean);
const allowed = (envAllowed.length ? envAllowed : defaultAllowed).map(normalizeOrigin).filter(Boolean);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use((req, res, next) => {
  const origin = normalizeOrigin(req.headers.origin);
  const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*');
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '600');
    return res.sendStatus(204);
  }
  next();
});
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    const cf = String(req.headers['cf-connecting-ip'] || '').trim();
    if (cf) return cf;
    const xff = String(req.headers['x-forwarded-for'] || '').trim();
    if (xff) return xff.split(',')[0].trim();
    return String(req.headers['x-real-ip'] || req.ip || '');
  },
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    const p = String(req.path || '');
    if (p === '/health' || p === '/api/health' || p === '/api/home') return true;
    if (p === '/api/webhook') return true;
    const k6 = String(req.headers['x-k6-test'] || '');
    if (k6 === '1') return true;
    return false;
  },
  handler: (req, res, _next, options) => {
    const origin = normalizeOrigin(req.headers.origin);
    const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*');
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(options.statusCode).json({ ok: false, error: 'Too Many Requests' });
  },
});
app.use(limiter);
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

setupSentry(app);

// Realtime (Socket.IO)
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      const o = normalizeOrigin(origin);
      if (!o) return cb(null, true);
      if (allowed.length === 0) return cb(null, true);
      cb(null, allowed.includes(o));
    },
    credentials: true
  },
  transports: ['websocket', 'polling']
});
setIO(io);
io.on('connection', (socket) => {
  const ch = socket.handshake.query?.channel;
  if (ch) socket.join(String(ch));
  socket.on('subscribe', (room) => socket.join(String(room)));
  socket.on('unsubscribe', (room) => socket.leave(String(room)));
});

app.get(['/health', '/api/health'], async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({ ok: true, db: true });
  } catch {
    return res.json({ ok: true, db: false });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/public'));
app.use('/api', require('./routes/dashboard'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/upload'));

app.use((err, req, res, next) => {
  try {
    const status = err.status || err.statusCode || 500;
    const msg = err.message || 'Erro interno';
    if (!res.headersSent) {
      res.status(status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const origin = normalizeOrigin(req.headers.origin);
      const allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] || '*');
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      res.setHeader('Vary', 'Origin');
      res.json({ error: msg });
    } else {
      next(err);
    }
  } catch {
    try {
      res.status(500).json({ error: 'Erro interno' });
    } catch {
      void 0;
    }
  }
});

useSentryErrorHandler(app);

const port = Number(process.env.PORT || 3001);
server.listen(port, async () => {
  try {
    await sequelize.sync({ alter: true });
    try {
      const [cols] = await sequelize.query("PRAGMA table_info('profiles')");
      const names = Array.isArray(cols) ? cols.map(c => String(c.name)) : [];
      if (!names.includes('reset_code')) {
        await sequelize.query("ALTER TABLE profiles ADD COLUMN reset_code TEXT");
      }
      if (!names.includes('reset_expires')) {
        await sequelize.query("ALTER TABLE profiles ADD COLUMN reset_expires DATETIME");
      }
    } catch {}
    // Seed default users if missing
    async function seedUser(email, password, cargo, nome) {
      const existing = await Profile.findOne({ where: { email } });
      if (existing) return existing;
      const hash = await bcrypt.hash(password, 10);
      return await Profile.create({ email, password_hash: hash, cargo, nome });
    }
    const count = await Profile.count();
    if (count === 0) {
      await seedUser('alangodoygtr@gmail.com', '@Aggtr4907', 'Produtor', 'Alan Godoy');
    }
    console.log(`API listening on ${port}`);
  } catch (e) {
    console.error('DB init failed', e);
  }
});
