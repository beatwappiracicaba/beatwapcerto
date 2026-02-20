import pool from './db.js';

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('📅 Hora do servidor:', result.rows[0].now);
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Tabelas encontradas:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    client.release();
    
    console.log('\n🎉 Teste de conexão concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
    process.exit(1);
  }
}

testConnection();