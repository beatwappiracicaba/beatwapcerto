/**
 * Cloudflare Worker - BeatWap API
 * Configuração profissional com CORS, Hyperdrive e tratamento de erros
 * @version 2.0.0
 */

import { Router } from './router.js';
import { addCorsHeaders, createPreflightResponse, createErrorResponseWithCors, isOriginAllowed } from './cors.js';

/**
 * Handler principal do Worker
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    
    try {
      // Valida conexão com Hyperdrive
      if (!env.DB) {
        throw new Error('Hyperdrive binding não configurado');
      }

      // Trata requisições OPTIONS (preflight)
      if (request.method === 'OPTIONS') {
        return createPreflightResponse(origin);
      }

      // Processa a requisição através do router
      const router = new Router(env);
      const response = await router.handle(request);
      
      // Adiciona CORS à resposta bem-sucedida
      return addCorsHeaders(response, origin);

    } catch (error) {
      // Em caso de erro, garante que CORS seja aplicado
      console.error('Worker Error:', error.message);
      return createErrorResponseWithCors(error, origin);
    }
  }
};