const { Pool } = require('pg');

const env = {
  DATABASE_URL: 'postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap'
};

async function checkSchema() {
  console.log('🔍 Verificando schema do banco de dados...');
  
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  
  try {
    // Verificar colunas das tabelas
    const tables = ['musics', 'compositions', 'sponsors'];
    
    for (const table of tables) {
      console.log(`\n📊 Colunas da tabela ${table}:`);
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    
    // Verificar se as colunas específicas existem
    console.log('\n🔍 Verificando colunas específicas:');
    const specificColumns = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (
        (table_name = 'musics' AND column_name = 'duracao') OR
        (table_name = 'compositions' AND column_name = 'descricao') OR
        (table_name = 'sponsors' AND column_name = 'logo_url')
      )
    `);
    
    specificColumns.rows.forEach(row => {
      console.log(`✅ ${row.table_name}.${row.column_name} existe`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();