import { pool } from './db.js';

async function checkArtistTable() {
  console.log('Verificando tabelas de artistas...');
  try {
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%artist%'");
    console.log('Tabelas de artistas encontradas:', result.rows);
    
    // Verificar estrutura da tabela profiles
    const profilesResult = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles'");
    console.log('Estrutura da tabela profiles:', profilesResult.rows.map(r => `${r.column_name} (${r.data_type})`));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkArtistTable();