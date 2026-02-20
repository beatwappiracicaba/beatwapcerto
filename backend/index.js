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
const PORT = process.env.PORT || 3000;

// CORS configuration for Cloudflare Pages
app.use(cors({
  origin: ['https://beatwapproducoes.pages.dev', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/musics', musicRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/producers', producerRoutes);
app.use('/api/compositions', compositionRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BeatWap Backend is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Conectado ao PostgreSQL CloudClusters`);
});