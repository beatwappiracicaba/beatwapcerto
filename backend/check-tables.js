import { pool } from './db.js';

async function checkTables() {
  console.log('Verificando tabelas...');
  try {
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('compositions', 'sponsors')");
    console.log('Tabelas encontradas:', result.rows);
    
    // Testar se as tabelas têm dados
    const compResult = await pool.query('SELECT COUNT(*) as count FROM public.compositions');
    console.log('Compositions count:', compResult.rows[0]);
    
    const sponsorsResult = await pool.query('SELECT COUNT(*) as count FROM public.sponsors');
    console.log('Sponsors count:', sponsorsResult.rows[0]);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();