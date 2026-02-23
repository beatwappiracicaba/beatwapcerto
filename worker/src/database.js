import { Pool } from 'pg';

export function createPool(env) {
  try {
    // Tentar primeiro com DATABASE_URL direta (mais confiável)
    if (env.DATABASE_URL) {
      console.log('🔄 Tentando conexão com DATABASE_URL direta...');
      
      // Parse da URL para verificar componentes
      const urlMatch = env.DATABASE_URL.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      
      if (urlMatch) {
        const [, user, password, host, port, database] = urlMatch;
        console.log(`📡 Conectando ao banco: ${host}:${port}/${database} (user: ${user})`);
        
        const pool = new Pool({
          host,
          port: parseInt(port),
          database,
          user,
          password,
          ssl: { rejectUnauthorized: false },
          max: 3,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 10000,
        });
        
        console.log('✅ Conexão com DATABASE_URL estabelecida');
        return pool;
      }
    }
    
    // Segunda tentativa: Hyperdrive
    if (env.DB?.connectionString) {
      console.log('🔄 Tentando conexão com Hyperdrive...');
      const pool = new Pool({
        connectionString: env.DB.connectionString,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      });
      console.log('✅ Conexão com Hyperdrive estabelecida');
      return pool;
    }
    
    // Terceira tentativa: construir URL com componentes
    if (env.DB_HOST && env.DB_USER && env.DB_PASSWORD && env.DB_NAME) {
      console.log('🔄 Tentando conexão com componentes...');
      const connectionString = `postgres://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT || 5432}/${env.DB_NAME}`;
      const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      });
      console.log('✅ Conexão com componentes estabelecida');
      return pool;
    }
    
    throw new Error('Nenhuma configuração de banco de dados disponível');
    
  } catch (error) {
    console.error('❌ Erro ao criar pool de conexão:', error.message);
    return null;
  }
}