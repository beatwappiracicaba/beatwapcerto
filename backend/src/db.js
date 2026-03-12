import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ? String(process.env.DATABASE_URL).trim() : '';
if (!connectionString) {
  throw new Error('DATABASE_URL não definida');
}

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5000),
  options: `-c statement_timeout=${Number(process.env.PG_STATEMENT_TIMEOUT_MS || 30000)}`,
});
