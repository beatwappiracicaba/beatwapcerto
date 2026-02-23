export const CONFIG = {
  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: [
      'https://beatwapproducoes.pages.dev',
      'https://www.beatwap.com.br',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
    ALLOW_CREDENTIALS: true,
    MAX_AGE: 86400
  },
  
  // Database Configuration
  DATABASE: {
    CONNECTION_TIMEOUT: 10000,
    IDLE_TIMEOUT: 30000,
    MAX_CONNECTIONS: 5,
    QUERY_TIMEOUT: 30000
  },
  
  // API Configuration
  API: {
    MAX_RESULTS_PER_PAGE: 50,
    DEFAULT_PAGE_SIZE: 20,
    HEALTH_CHECK_TIMEOUT: 5000
  },
  
  // Security Configuration
  SECURITY: {
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: 100,
    ENABLE_CORS: true
  },
  
  // Logging Configuration
  LOGGING: {
    ENABLE_REQUEST_LOGGING: true,
    ENABLE_ERROR_LOGGING: true,
    LOG_LEVEL: 'info'
  }
};
