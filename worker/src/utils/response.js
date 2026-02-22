// src/utils/response.js - Response helpers
export function jsonResponse(data, status = 200, env) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.FRONTEND_URL || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}

export function errorResponse(message, status = 400, env) {
  return jsonResponse({ message, error: true }, status, env);
}

export function successResponse(data, message = 'Success', status = 200, env) {
  return jsonResponse({ 
    success: true, 
    message, 
    data 
  }, status, env);
}