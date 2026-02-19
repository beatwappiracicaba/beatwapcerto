import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const args = process.argv.slice(2);
const map = {};
for (let i = 0; i < args.length; i += 2) {
  const k = args[i];
  const v = args[i + 1];
  if (k && k.startsWith('--')) map[k.slice(2)] = v;
}

const conn = map.conn;
const email = map.email;
const password = map.password;
const name = map.name || email?.split('@')[0] || null;
const role = map.role || 'Artista';

if (!conn || !email || !password || !name) {
  console.error('Usage: node createUser.js --conn "<postgres-url>" --email "<email>" --password "<pwd>" --name "<name>" --role "<role>"');
  process.exit(1);
}

const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pwdHash = await bcrypt.hash(password, 12);
    const existing = await client.query('select id from users where email=$1', [email]);
    let userId;
    if (existing.rowCount > 0) {
      userId = existing.rows[0].id;
      await client.query(
        'update users set name=$1, password=$2, password_hash=$2, role=$3, failed_attempts=0, locked_until=null where id=$4',
        [name, pwdHash, role, userId]
      );
    } else {
      const ins = await client.query(
        'insert into users (name,email,password,password_hash,role,created_at) values ($1,$2,$3,$3,$4,now()) returning id',
        [name, email, pwdHash, role]
      );
      userId = ins.rows[0].id;
    }
    const prof = await client.query('select 1 from profiles where id=$1', [userId]);
    if (prof.rowCount === 0) {
      await client.query(
        'insert into profiles (id, nome, cargo, created_at) values ($1,$2,$3,now())',
        [userId, name, role]
      );
    } else {
      await client.query(
        'update profiles set nome=$1, cargo=$2 where id=$3',
        [name, role, userId]
      );
    }
    await client.query('COMMIT');
    console.log(`User upserted: ${email} (${role})`);
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
