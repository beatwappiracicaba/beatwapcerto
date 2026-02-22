// src/utils/pg-client.js - Cliente PostgreSQL otimizado para Workers
export class PGClient {
  constructor(env) {
    this.env = env;
    this.config = {
      host: env.DB_HOST,
      port: env.DB_PORT || 5432,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false } // Necessário para CloudClusters
    };
  }

  async query(text, params = []) {
    try {
      // Usar fetch para conectar ao PostgreSQL via HTTP proxy ou driver serverless
      const response = await fetch(this.env.DATABASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.DB_TOKEN || ''}`
        },
        body: JSON.stringify({
          query: text,
          params: params
        })
      });

      if (!response.ok) {
        throw new Error(`Database error: ${response.status}`);
      }

      const result = await response.json();
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async close() {
    // Não há conexão persistente para fechar em serverless
  }
}