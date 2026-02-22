// Endpoint proxy para Cloudflare Worker executar queries no banco de dados
import { pool } from '../db.js';

export const createDatabaseProxy = (app) => {
  // Middleware de autenticação simples para o Worker
  const authenticateWorker = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    // Token simples - em produção use algo mais seguro
    if (token !== process.env.WORKER_TOKEN || 'worker-secret-token') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    next();
  };

  // Endpoint proxy para queries
  app.post('/api/db/query', authenticateWorker, async (req, res) => {
    const { query, params = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }
    
    try {
      const result = await pool.query(query, params);
      
      res.json({
        rows: result.rows,
        rowCount: result.rowCount,
        success: true
      });
    } catch (error) {
      console.error('Database proxy error:', error);
      res.status(500).json({ 
        error: 'Erro ao executar query',
        message: error.message 
      });
    }
  });

  // Endpoint de health check
  app.get('/api/db/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
};