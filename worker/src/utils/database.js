// src/utils/database.js - Conexão PostgreSQL via Hyperdrive
import { Pool } from 'pg';

let pool;

export class Database {
  constructor(env) {
    this.env = env;
    
    // Criar pool de conexões se ainda não existir
    if (!pool) {
      pool = new Pool({
        connectionString: env.DB?.connectionString || env.DATABASE_URL
      });
    }
    
    this.pool = pool;
  }

  async query(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        success: true
      };
    } catch (error) {
      console.error('Database query error:', error);
      return {
        rows: [],
        rowCount: 0,
        success: false,
        error: error.message
      };
    }
  }

  async queryWithReturn(sql, params = []) {
    return await this.query(sql, params);
  }
}