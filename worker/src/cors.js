import { CONFIG } from './config.js';

export function corsHeaders(request) {
  const reqOrigin =
    (request && (request.headers.get('Origin') || request.headers.get('origin'))) ||
    null;
  const allowed = CONFIG.CORS.ALLOWED_ORIGINS || [];
  const allowOrigin = reqOrigin && allowed.includes(reqOrigin) ? reqOrigin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': CONFIG.CORS.ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': CONFIG.CORS.ALLOWED_HEADERS.join(', '),
    'Access-Control-Allow-Credentials': CONFIG.CORS.ALLOW_CREDENTIALS.toString(),
    'Access-Control-Max-Age': CONFIG.CORS.MAX_AGE.toString(),
    'Vary': 'Origin'
  };
}

export function handleCors(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request)
  });
}
