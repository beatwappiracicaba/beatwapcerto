// src/utils/response.js - Respostas JSON padronizadas
export function jsonResponse(data, status = 200, env) {
  const response = {
    success: status >= 200 && status < 300,
    data: data
  };
  
  return new Response(JSON.stringify(response), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env?.FRONTEND_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export function errorResponse(message, status = 500, env) {
  const response = {
    success: false,
    error: message
  };
  
  return new Response(JSON.stringify(response), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env?.FRONTEND_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export function successResponse(data, message = 'Success', status = 200, env) {
  const response = {
    success: true,
    data: data,
    message: message
  };
  
  return new Response(JSON.stringify(response), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env?.FRONTEND_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}