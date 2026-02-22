import { corsHeaders, handleCors } from './cors.js';

// Versão ULTRA-MÍNIMA - Remove banco de dados completamente
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests IMEDIATAMENTE
    if (request.method === 'OPTIONS') {
      return handleCors();
    }
    
    try {
      console.log(`🔄 Processing ${request.method} ${url.pathname}`);
      
      // ROTAS BÁSICAS SEM BANCO DE DADOS
      const pathname = url.pathname;
      
      // Health check
      if (pathname === '/health' || pathname === '/api/health') {
        return new Response(JSON.stringify({
          success: true,
          message: 'Worker is alive (emergency mode)',
          timestamp: new Date().toISOString(),
          version: 'emergency-v1.0'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
      
      // Todos os outros endpoints retornam array vazio
      const endpoints = [
        '/api/producers',
        '/api/profiles', 
        '/api/artists',
        '/api/composers',
        '/api/compositions',
        '/api/releases',
        '/api/sponsors',
        '/api/users',
        '/api/projects'
      ];
      
      if (endpoints.some(endpoint => pathname.startsWith(endpoint))) {
        return new Response(JSON.stringify({
          success: true,
          data: [],
          message: 'Database unavailable - emergency mode',
          endpoint: pathname
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
      
      // 404 para endpoints não reconhecidos
      return new Response(JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: endpoints
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
      
    } catch (error) {
      console.error('❌ Worker error:', error.message);
      
      // Sempre retornar JSON com CORS, mesmo em erro
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  }
};