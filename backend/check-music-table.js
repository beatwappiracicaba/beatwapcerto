import { pool } from './db.js';

async function checkMusicTable() {
  console.log('Verificando estrutura da tabela musics...');
  try {
    const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'musics'");
    console.log('Estrutura da tabela musics:', result.rows.map(r => `${r.column_name} (${r.data_type})`));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkMusicTable();