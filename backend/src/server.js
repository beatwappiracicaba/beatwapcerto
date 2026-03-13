const http = require('http');
const { createApp } = require('./app');
const { config } = require('./config');

function startServer() {
  const app = createApp();
  const server = http.createServer(app);
  server.listen(config.port, '0.0.0.0');
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
