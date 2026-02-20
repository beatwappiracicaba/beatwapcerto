// Importação dos módulos necessários
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js'; // Importa o pool de db.js
import profilesRoutes from './routes/profiles.route.js'; // Importa as rotas de perfis
import producersRoutes from './routes/producers.route.js';
import releasesRoutes from './routes/releases.route.js';
import compositionsRoutes from './routes/compositions.route.js';
import usersRoutes from './routes/users.route.js';
import artistsRoutes from './routes/artists.route.js';
import projectsRoutes from './routes/projects.route.js';
import composersRoutes from './routes/composers.route.js';
import sponsorsRoutes from './routes/sponsors.route.js';
import authRoutes from './routes/auth.route.js';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Inicializa o aplicativo Express
const app = express();

// Define a porta do servidor, usando a variável de ambiente ou 3000 como padrão
const PORT = process.env.PORT || 3000;

// Tenta conectar ao banco de dados para verificar a conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.stack);
  } else {
    console.log('🚀 Conexão com o banco de dados PostgreSQL estabelecida com sucesso!');
    client.release();
  }
});

// --- Configuração do CORS ---
const allowedOrigins = process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',') : [];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acesso não permitido por CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// --- Middlewares ---
app.use(express.json());

// --- Rotas ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Usa todas as rotas com o prefixo /api
app.use('/api', profilesRoutes);
app.use('/api', producersRoutes);
app.use('/api', releasesRoutes);
app.use('/api', compositionsRoutes);
app.use('/api', usersRoutes);
app.use('/api', artistsRoutes);
app.use('/api', projectsRoutes);
app.use('/api', composersRoutes);
app.use('/api', sponsorsRoutes);
app.use('/api', authRoutes);

// --- Tratamento de Erros ---
app.use((req, res, next) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error('Ocorreu um erro no servidor:', err.stack);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
  console.log(`🎉 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 URLs do frontend permitidas: ${allowedOrigins.join(', ')}`);
});

