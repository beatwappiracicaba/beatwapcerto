import { CONFIG } from './config.js';

export function corsHeaders(request) {
  const reqOrigin =
    (request && (request.headers.get('Origin') || request.headers.get('origin'))) ||
    null;
  const allowed = CONFIG.CORS.ALLOWED_ORIGINS || [];
  
  // Check if origin is allowed or if it's a preview deployment
  let allowOrigin = allowed[0];
  
  if (reqOrigin) {
    if (allowed.includes(reqOrigin)) {
      allowOrigin = reqOrigin;
    } else if (reqOrigin.endsWith('.pages.dev') || reqOrigin.includes('localhost') || reqOrigin.includes('127.0.0.1')) {
      // Allow preview deployments and local development dynamically
      allowOrigin = reqOrigin;
    }
  }

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
