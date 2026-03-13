const http = require('http');
const { createApp } = require('./app');
const { config } = require('./config');
const { cleanupExpiredEvents } = require('./db');

function startServer() {
  const app = createApp();
  const server = http.createServer(app);
  server.listen(config.port, '0.0.0.0');

  cleanupExpiredEvents().catch(() => void 0);
  const intervalMs = Number(process.env.EVENTS_CLEANUP_INTERVAL_MS || 30 * 60 * 1000);
  if (Number.isFinite(intervalMs) && intervalMs > 0) {
    setInterval(() => {
      cleanupExpiredEvents().catch(() => void 0);
    }, intervalMs);
  }

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
