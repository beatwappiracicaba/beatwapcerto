import { corsHeaders } from './cors.js';

export function createSuccessResponse(data = [], request = null) {
  return new Response(JSON.stringify({
    success: true,
    data: Array.isArray(data) ? data : [data],
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...(request ? corsHeaders(request) : {})
    }
  });
}

export function createErrorResponse(error, statusCode = 500, headers = {}) {
  return {
    success: false,
    error: error.message || error.toString() || 'Unknown error',
    statusCode,
    timestamp: new Date().toISOString()
  };
}

export function createArrayResponse(data = [], request = null) {
  // Garante que sempre retorna um array, mesmo que vazio
  const arrayData = Array.isArray(data) ? data : (data ? [data] : []);
  return createSuccessResponse(arrayData, request);
}

export function createResponse(success, data, error, statusCode = 200, request = null) {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    response.data = data;
  } else {
    response.error = error;
  }
  
  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(request ? corsHeaders(request) : {})
    }
  });
}