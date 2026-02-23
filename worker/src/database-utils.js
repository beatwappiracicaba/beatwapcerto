// Função utilitária para retry de queries com timeout
export async function queryWithRetry(pool, query, params = [], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error(`Query attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}

// Função para testar conexão com o banco
export async function testConnection(pool) {
  try {
    const result = await queryWithRetry(pool, 'SELECT 1 as test', [], 2, 3000);
    return result.rows[0].test === 1;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
}