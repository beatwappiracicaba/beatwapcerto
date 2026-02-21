import { pool } from './db.js';

async function testDatabase() {
  try {
    console.log('🧪 Testando conexão com o banco de dados...');
    
    // Testar conexão
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexão com banco de dados funcionando:', result.rows[0].now);
    
    // Listar tabelas
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 Tabelas disponíveis:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Testar dados
    const profiles = await pool.query('SELECT COUNT(*) as total FROM public.profiles');
    console.log(`👥 Total de perfis: ${profiles.rows[0].total}`);
    
    const musics = await pool.query('SELECT COUNT(*) as total FROM public.musics');
    console.log(`🎵 Total de músicas: ${musics.rows[0].total}`);
    
    const projects = await pool.query('SELECT COUNT(*) as total FROM public.producer_projects');
    console.log(`🎯 Total de projetos: ${projects.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro ao testar banco de dados:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();