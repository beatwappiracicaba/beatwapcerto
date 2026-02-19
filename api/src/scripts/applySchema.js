import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const val = args[i + 1];
  if (key && key.startsWith('--')) {
    argMap[key.slice(2)] = val;
  }
}

let DB_HOST = process.env.DB_HOST || argMap.host;
let DB_PORT = process.env.DB_PORT || argMap.port;
let DB_USER = process.env.DB_USER || argMap.user;
let DB_PASSWORD = process.env.DB_PASSWORD || argMap.password;
let DB_NAME = process.env.DB_NAME || argMap.db;

if (argMap.conn) {
  try {
    const u = new URL(argMap.conn);
    DB_HOST = DB_HOST || u.hostname;
    DB_PORT = DB_PORT || u.port;
    DB_USER = DB_USER || decodeURIComponent(u.username);
    DB_PASSWORD = DB_PASSWORD || decodeURIComponent(u.password);
    DB_NAME = DB_NAME || u.pathname.replace(/^\//, '');
  } catch (e) {
    console.error('Invalid --conn URL:', e.message);
    process.exit(1);
  }
}

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error('Missing required DB environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).');
  process.exit(1);
}

const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const sqlPath = path.resolve(__dirname, '../../sql/init.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema applied successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed to apply schema:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
