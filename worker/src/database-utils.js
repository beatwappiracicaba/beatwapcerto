// Função utilitária para retry de queries com timeout
export async function queryWithRetry(pool, query, params = [], maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!pool) {
        throw new Error('Pool is null or undefined');
      }
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error(`Query attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Função para testar conexão com o banco
export async function testConnection(pool) {
  try {
    console.log('[testConnection] Testando conexão com o banco...');
    
    if (!pool) {
      console.error('[testConnection] Pool é nulo');
      return false;
    }
    
    // Tentar um método mais simples primeiro
    try {
      console.log('[testConnection] Tentando conectar com pool.connect()...');
      const client = await pool.connect();
      console.log('[testConnection] Conexão estabelecida com sucesso!');
      client.release();
      return true;
    } catch (connectError) {
      console.error('[testConnection] Erro ao conectar:', connectError.message);
      
      // Se falhar, tentar uma query simples
      try {
        console.log('[testConnection] Tentando query simples...');
        const result = await pool.query('SELECT 1');
        console.log('[testConnection] Query simples executada com sucesso!');
        return true;
      } catch (queryError) {
        console.error('[testConnection] Erro na query simples:', queryError.message);
        return false;
      }
    }
  } catch (error) {
    console.error('[testConnection] Database connection test failed:', error.message);
    return false;
  }
}