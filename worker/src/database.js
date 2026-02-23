import { Pool } from 'pg';

let pool = null;

export function createPool(env) {
  if (!pool) {
    try {
      // Usar Hyperdrive diretamente
      const connectionString = env.DB?.connectionString;
      
      if (!connectionString) {
        console.warn('⚠️ Hyperdrive connection string not found, using fallback');
        // Fallback para DATABASE_URL direto se Hyperdrive falhar
        const fallbackUrl = env.DATABASE_URL || env.DB_HOST ? 
          `postgres://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}` : null;
        
        if (fallbackUrl) {
          pool = new Pool({
            connectionString: fallbackUrl,
            ssl: { rejectUnauthorized: false },
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          });
          console.log('✅ Using fallback database connection');
        } else {
          throw new Error('No database connection available');
        }
      } else {
        // Usar Hyperdrive
        pool = new Pool({
          connectionString,
          ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        console.log('✅ Using Hyperdrive connection');
      }
    } catch (error) {
      console.error('❌ Failed to create database pool:', error.message);
      return null;
    }
  }
  return pool;
}

export function closePool() {
  if (pool) {
    pool.end();
    pool = null;
    console.log('🔒 Database pool closed');
  }
}