// src/examples/cors-config.js
// Configuração CORS completa para Cloudflare Workers

export function configureCors(env) {
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes('*') ? '*' : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  };
}

// Função para lidar com requisições CORS
export function handleCorsRequest(request, env) {
  if (request.method === 'OPTIONS') {
    const headers = configureCors(env);
    return new Response(null, {
      status: 204,
      headers
    });
  }
  
  return null; // Continuar com a requisição normal
}

// Exemplo de uso nas rotas
export function createCorsResponse(data, status = 200, env) {
  const headers = configureCors(env);
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  });
}