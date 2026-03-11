import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definida');
}

const app = express();
const port = Number(process.env.PORT || 3000);

const allowedOrigins = new Set(['https://www.beatwap.com.br', 'https://www.beatwap.com']);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('Acesso não permitido por CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`API ouvindo em 127.0.0.1:${port}\n`);
});
