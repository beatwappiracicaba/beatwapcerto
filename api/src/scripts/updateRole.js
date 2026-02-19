import { Pool } from 'pg';

const args = process.argv.slice(2);
const map = {};
for (let i = 0; i < args.length; i += 2) {
  const k = args[i];
  const v = args[i + 1];
  if (k && k.startsWith('--')) map[k.slice(2)] = v;
}

const conn = map.conn;
const email = map.email;
const role = map.role;

if (!conn || !email || !role) {
  console.error('Usage: node updateRole.js --conn "<postgres-url>" --email "<email>" --role "<role>"');
  process.exit(1);
}

const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('update users set role=$1 where email=$2 returning id', [role, email]);
    if (r.rowCount === 0) {
      throw new Error('User not found');
    }
    const userId = r.rows[0].id;
    const p = await client.query('select 1 from profiles where id=$1', [userId]);
    if (p.rowCount === 0) {
      await client.query('insert into profiles (id, cargo, created_at) values ($1,$2,now())', [userId, role]);
    } else {
      await client.query('update profiles set cargo=$1 where id=$2', [role, userId]);
    }
    await client.query('COMMIT');
    console.log(`Role updated for ${email} -> ${role}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
