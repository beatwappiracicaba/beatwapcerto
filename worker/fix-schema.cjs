const { Pool } = require('pg');

function createPool(env) {
  try {
    if (env.DATABASE_URL) {
      console.log('🔄 Tentando conexão com DATABASE_URL direta...');
      const pool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      });
      console.log('✅ Conexão estabelecida');
      return pool;
    }
    return null;
  } catch (error) {
    console.error('❌ Erro ao criar pool:', error.message);
    return null;
  }
}

const env = {
  DATABASE_URL: 'postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap'
};

async function fixSchema() {
  console.log('🔄 Conectando ao banco de dados...');
  
  const pool = createPool(env);
  if (!pool) {
    console.error('❌ Não foi possível conectar ao banco');
    return;
  }
  
  try {
    console.log('📋 Executando alterações de schema...');
    
    // Adicionar colunas faltantes
    await pool.query(`
      -- Tabela compositions: adicionar coluna descricao
      ALTER TABLE public.compositions 
      ADD COLUMN IF NOT EXISTS descricao TEXT;
      
      -- Tabela sponsors: adicionar coluna logo_url
      ALTER TABLE public.sponsors 
      ADD COLUMN IF NOT EXISTS logo_url TEXT;
      
      -- Tabela musics: adicionar coluna duracao
      ALTER TABLE public.musics 
      ADD COLUMN IF NOT EXISTS duracao INTEGER;
    `);
    
    console.log('✅ Schema atualizado com sucesso!');
    
    // Verificar se as colunas foram adicionadas
    const result = await pool.query(`
      SELECT column_name, table_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('compositions', 'sponsors', 'musics')
      AND column_name IN ('descricao', 'logo_url', 'duracao')
    `);
    
    console.log('📊 Colunas verificadas:', result.rows);
    
  } catch (error) {
    console.error('❌ Erro ao executar alterações:', error.message);
  } finally {
    await pool.end();
    console.log('🏁 Conexão encerrada');
  }
}

fixSchema();