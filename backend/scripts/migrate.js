import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ? String(process.env.DATABASE_URL).trim() : '';
if (!connectionString) {
  throw new Error('DATABASE_URL não definida');
}

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '..', 'migrations');

const pool = new Pool({ connectionString, max: 1 });

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function isApplied(client, id) {
  const { rows } = await client.query('SELECT 1 FROM public.schema_migrations WHERE id = $1 LIMIT 1', [id]);
  return rows.length > 0;
}

async function markApplied(client, id) {
  await client.query('INSERT INTO public.schema_migrations (id) VALUES ($1)', [id]);
}

async function run() {
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    for (const file of files) {
      const id = file;
      if (await isApplied(client, id)) {
        process.stdout.write(`skip ${id}\n`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await markApplied(client, id);
        await client.query('COMMIT');
        process.stdout.write(`applied ${id}\n`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});

