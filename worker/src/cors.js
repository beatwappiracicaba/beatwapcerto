import { CONFIG } from './config.js';

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': CONFIG.CORS.ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': CONFIG.CORS.ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': CONFIG.CORS.ALLOWED_HEADERS.join(', '),
    'Access-Control-Allow-Credentials': CONFIG.CORS.ALLOW_CREDENTIALS.toString(),
    'Access-Control-Max-Age': CONFIG.CORS.MAX_AGE.toString(),
    'Vary': 'Origin'
  };
}

export function handleCors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}