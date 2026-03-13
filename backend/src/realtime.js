const clients = new Set();

function sseWrite(res, event, payload) {
  const body = `event: ${event}\ndata: ${JSON.stringify(payload == null ? null : payload)}\n\n`;
  res.write(body);
}

function registerClient(res) {
  clients.add(res);
  const cleanup = () => clients.delete(res);
  return cleanup;
}

function emit(event, payload) {
  for (const res of clients) {
    try {
      if (!res.writableEnded) sseWrite(res, event, payload);
    } catch {
      try {
        clients.delete(res);
      } catch {
        void 0;
      }
    }
  }
}

module.exports = { registerClient, emit, sseWrite };
