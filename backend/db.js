import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: 'postgresql-208539-0.cloudclusters.net',
  port: 19931,
  database: 'BeatWap',
  user: 'Alan Godoy',
  password: '@Aggtr4907',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;