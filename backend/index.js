import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profiles.routes.js';
import musicRoutes from './routes/musics.routes.js';
import projectRoutes from './routes/projects.routes.js';
import eventRoutes from './routes/events.routes.js';
import producerRoutes from './routes/producers.routes.js';
import compositionRoutes from './routes/compositions.routes.js';
import releaseRoutes from './routes/releases.routes.js';
import sponsorRoutes from './routes/sponsors.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 19931;

// CORS configuration for Cloudflare Pages and HTTPS domain
app.use(cors({
  origin: ['https://beatwapproducoes.pages.dev', 'https://api.beatwapproducoes.pages.dev', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Additional CORS headers middleware
app.use((req, res, next) => {
  const allowedOrigins = ['https://beatwapproducoes.pages.dev', 'https://api.beatwapproducoes.pages.dev', 'http://localhost:5173'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/musics', musicRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/producers', producerRoutes);
app.use('/api/compositions', compositionRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/upload', uploadRoutes);

// Configurar para aceitar conexões externas
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acessível via IP: http://108.181.197.180:${PORT}`);
  console.log(`📡 Conectado ao PostgreSQL CloudClusters`);
});