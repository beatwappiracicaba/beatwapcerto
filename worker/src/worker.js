import { Pool } from 'pg';
import { corsHeaders, handleCors } from './cors.js';
import { createErrorResponse } from './response.js';
import { handleRequest } from './router.js';
import { CONFIG } from './config.js';

let pool = null;

function createPool(env) {
  if (!pool) {
    try {
      const connectionString = env.DB?.connectionString || env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error('Database connection string not found');
      }
      
      pool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      
      console.log('✅ Database pool created successfully');
    } catch (error) {
      console.error('❌ Failed to create database pool:', error);
      throw error;
    }
  }
  return pool;
}

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCors();
    }
    
    try {
      // Initialize database connection
      const databasePool = createPool(env);
      
      // Test database connection
      try {
        await databasePool.query('SELECT 1');
        console.log('✅ Database connection test passed');
      } catch (dbError) {
        console.error('❌ Database connection test failed:', dbError);
        return createErrorResponse('Database connection failed', 503, corsHeaders());
      }
      
      const url = new URL(request.url);
      const response = await handleRequest(url.pathname, databasePool, env, request);
      
      // Ensure response has proper structure
      if (!response || typeof response !== 'object') {
        return createErrorResponse('Invalid response format', 500, corsHeaders());
      }
      
      // Handle success responses
      if (response.success === true) {
        const processingTime = Date.now() - startTime;
        console.log(`✅ Request processed in ${processingTime}ms: ${url.pathname}`);
        
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          }
        });
      }
      
      // Handle error responses from router
      if (response.success === false && response.error === 'Endpoint não encontrado') {
        return createErrorResponse('Endpoint not found', 404, corsHeaders());
      }
      
      // Handle other errors from router
      if (response.success === false) {
        return createErrorResponse(response.error || 'Internal server error', 500, corsHeaders());
      }
      
      // Fallback for unexpected response format
      return createErrorResponse('Unexpected response format', 500, corsHeaders());
      
    } catch (error) {
      console.error('❌ Worker error:', error);
      
      // Handle timeout errors specifically
      if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        return createErrorResponse('Request timeout', 504, corsHeaders());
      }
      
      // Handle database connection errors
      if (error.message?.includes('connection') || error.code === 'ECONNREFUSED') {
        return createErrorResponse('Database connection error', 503, corsHeaders());
      }
      
      // Generic error response
      return createErrorResponse('Internal server error', 500, corsHeaders());
    }
  }
};