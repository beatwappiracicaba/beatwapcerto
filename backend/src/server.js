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
app.set('trust proxy', false);
const defaultAllowed = ['https://www.beatwap.com.br', 'https://beatwap.com.br'];
const envAllowed = String(process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const allowed = envAllowed.length ? envAllowed : defaultAllowed;
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => String(req.headers['x-real-ip'] || req.ip || '')
});
app.use(limiter);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.length === 0) return cb(null, true);
    cb(null, allowed.includes(origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

setupSentry(app);

// Realtime (Socket.IO)
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.length === 0) return cb(null, true);
      cb(null, allowed.includes(origin));
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

useSentryErrorHandler(app);

const port = Number(process.env.PORT || 3011);
server.listen(port, async () => {
  try {
    await sequelize.sync({ alter: true });
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
