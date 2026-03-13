require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write('Missing DATABASE_URL\n');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function ensureMigrationsTable(client) {
  await client.query(
    'create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())'
  );
}

async function getApplied(client) {
  const { rows } = await client.query('select id from schema_migrations');
  return new Set(rows.map((r) => String(r.id)));
}

async function applyMigration(client, id, sql) {
  await client.query('begin');
  try {
    await client.query(sql);
    await client.query('insert into schema_migrations (id) values ($1)', [id]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);
    const dir = path.join(__dirname, '..', 'migrations');
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, 'en'));

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await applyMigration(client, file, sql);
      ran += 1;
      process.stdout.write(`applied ${file}\n`);
    }

    if (ran === 0) process.stdout.write('no migrations to apply\n');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  process.stderr.write(`${String(e && e.stack ? e.stack : e)}\n`);
  process.exit(1);
});
