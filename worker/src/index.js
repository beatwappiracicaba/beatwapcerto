// src/index.js - Entry point principal do Worker
import { handleCors } from './utils/cors.js';
import { router } from './router.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    try {
      // Roteamento principal
      return await router(request, env);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ 
          message: 'Internal server error',
          error: error.message 
        }), 
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
          }
        }
      );
    }
  }
};