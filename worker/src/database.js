import { Pool } from 'pg';

export function createPool(env) {
  try {
    console.log('🔄 Iniciando criação do pool de conexão...');
    
    // Primeira tentativa: usar DATABASE_URL com configuração mínima
    if (env.DATABASE_URL) {
      console.log('🔄 Tentando conexão com DATABASE_URL (configuração mínima)...');
      console.log('🔄 DATABASE_URL disponível:', env.DATABASE_URL.substring(0, 50) + '...');
      
      try {
        // Tentar conexão com configuração mínima
        const pool = new Pool({
          connectionString: env.DATABASE_URL,
          ssl: false, // Desabilitar completamente o SSL
          max: 1, // Reduzir o número máximo de conexões
          idleTimeoutMillis: 10000, // Reduzir timeout
          connectionTimeoutMillis: 5000, // Reduzir timeout de conexão
        });
        
        console.log('✅ Conexão com DATABASE_URL estabelecida (configuração mínima)');
        return pool;
      } catch (error) {
        console.error('❌ Falha com configuração mínima:', error.message);
        
        // Tentar com SSL habilitado
        try {
          const pool = new Pool({
            connectionString: env.DATABASE_URL,
            ssl: { 
              rejectUnauthorized: false
            },
            max: 1,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 5000,
          });
          
          console.log('✅ Conexão com DATABASE_URL estabelecida (SSL básico)');
          return pool;
        } catch (error2) {
          console.error('❌ Falha com SSL básico:', error2.message);
        }
      }
    }
    
    // Segunda tentativa: usar componentes individuais com encoding manual
    if (env.DB_HOST && env.DB_USER && env.DB_PASSWORD && env.DB_NAME) {
      console.log('🔄 Tentando conexão com componentes...');
      console.log(`🔄 Host: ${env.DB_HOST}, Port: ${env.DB_PORT || 19931}, User: ${env.DB_USER}, Database: ${env.DB_NAME}`);
      
      // Aplicar encoding na senha para lidar com caracteres especiais
      const encodedPassword = encodeURIComponent(env.DB_PASSWORD);
      console.log(`🔄 Senha original: ${env.DB_PASSWORD}, Senha encoded: ${encodedPassword}`);
      
      const pool = new Pool({
        host: env.DB_HOST,
        port: parseInt(env.DB_PORT) || 19931,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: encodedPassword,
        ssl: { 
          rejectUnauthorized: false,
          require: true
        },
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });
      
      console.log('✅ Conexão com componentes estabelecida');
      return pool;
    }
    
    // Terceira tentativa: Hyperdrive
    if (env.DB?.connectionString) {
      console.log('🔄 Tentando conexão com Hyperdrive...');
      const pool = new Pool({
        connectionString: env.DB.connectionString,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });
      console.log('✅ Conexão com Hyperdrive estabelecida');
      return pool;
    }
    
    throw new Error('Nenhuma configuração de banco de dados disponível');
    
  } catch (error) {
    console.error('❌ Erro ao criar pool de conexão:', error.message);
    return null;
  }
}