export function createSuccessResponse(data = []) {
  return {
    success: true,
    data: Array.isArray(data) ? data : [data],
    timestamp: new Date().toISOString()
  };
}

export function createErrorResponse(error, statusCode = 500, headers = {}) {
  return {
    success: false,
    error: error.message || error.toString() || 'Unknown error',
    statusCode,
    timestamp: new Date().toISOString()
  };
}

export function createArrayResponse(data = []) {
  // Garante que sempre retorna um array, mesmo que vazio
  const arrayData = Array.isArray(data) ? data : (data ? [data] : []);
  return createSuccessResponse(arrayData);
}