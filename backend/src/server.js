import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definida');
}

const app = express();
const port = Number(process.env.PORT || 3000);
app.set('trust proxy', true);

const allowedOrigins = new Set([
  'https://www.beatwap.com.br',
  'https://beatwap.com.br',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const o = String(origin);
    if (allowedOrigins.has(o)) return cb(null, true);
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '5mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.use('/api', (req, res, next) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`API ouvindo em 127.0.0.1:${port}\n`);
});
