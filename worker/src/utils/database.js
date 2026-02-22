// src/utils/database.js - Conexão PostgreSQL serverless
export class Database {
  constructor(env) {
    this.env = env;
  }

  async query(sql, params = []) {
    try {
      const response = await fetch(this.env.DATABASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.DATABASE_TOKEN || ''}`
        },
        body: JSON.stringify({
          query: sql,
          params: params
        })
      });

      if (!response.ok) {
        throw new Error(`Database error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async queryWithReturn(sql, params = []) {
    const result = await this.query(sql, params);
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0
    };
  }
}