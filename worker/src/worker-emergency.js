import { Pool } from 'pg';
import { corsHeaders, handleCors } from './cors.js';
import { createErrorResponse, createArrayResponse } from './response.js';
import { handleRequest } from './router.js';
import { CONFIG } from './config.js';

let pool = null;

function createPool(env) {
  if (!pool) {
    try {
      // Usar Hyperdrive diretamente SEM teste de conexão
      const connectionString = env.DB?.connectionString;
      
      if (!connectionString) {
        console.warn('⚠️ Hyperdrive connection string not found, using fallback');
        // Fallback para DATABASE_URL direto se Hyperdrive falhar
        const fallbackUrl = env.DATABASE_URL || env.DB_HOST ? 
          `postgres://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}` : null;
        
        if (fallbackUrl) {
          pool = new Pool({
            connectionString: fallbackUrl,
            ssl: { rejectUnauthorized: false },
            max: 3,
            idleTimeoutMillis: 20000,
            connectionTimeoutMillis: 5000, // Reduzido para 5s
          });
          console.log('✅ Using fallback database connection');
        } else {
          throw new Error('No database connection available');
        }
      } else {
        // Usar Hyperdrive
        pool = new Pool({
          connectionString,
          ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
          max: 3,
          idleTimeoutMillis: 20000,
          connectionTimeoutMillis: 5000, // Reduzido para 5s
        });
        console.log('✅ Using Hyperdrive connection');
      }
    } catch (error) {
      console.error('❌ Failed to create database pool:', error.message);
      // Não jogar erro, retornar null para permitir funcionamento offline
      return null;
    }
  }
  return pool;
}

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    
    // Handle CORS preflight requests IMEDIATAMENTE
    if (request.method === 'OPTIONS') {
      return handleCors();
    }
    
    try {
      // Log da tentativa de conexão
      console.log(`🔄 Processing ${request.method} ${url.pathname}`);
      
      // Inicializar database (sem teste de conexão)
      const databasePool = createPool(env);
      
      // Se não conseguiu criar pool, retornar dados mock para não quebrar o frontend
      if (!databasePool) {
        console.warn('⚠️ Database unavailable, returning mock data');
        return new Response(JSON.stringify({
          success: true,
          data: []
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
      
      // Processar requisição SEM testar conexão primeiro
      return await handleRequest(request.url.pathname, databasePool, env, request);
      
    } catch (error) {
      console.error('❌ Worker error:', error.message);
      
      // Sempre retornar JSON com CORS, mesmo em erro
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: error.status || 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  }
};