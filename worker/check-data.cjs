const { Pool } = require('pg');

const env = {
  DATABASE_URL: 'postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap'
};

async function checkData() {
  console.log('🔍 Verificando dados nas tabelas...');
  
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  
  try {
    // Verificar quantidade de dados em cada tabela
    const tables = ['profiles', 'musics', 'sponsors', 'compositions'];
    
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM public.${table}`);
      console.log(`📊 ${table}: ${result.rows[0].count} registros`);
      
      // Se tiver dados, mostrar uma amostra
      if (result.rows[0].count > 0) {
        const sample = await pool.query(`SELECT * FROM public.${table} LIMIT 2`);
        console.log(`  Amostra:`, JSON.stringify(sample.rows, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();