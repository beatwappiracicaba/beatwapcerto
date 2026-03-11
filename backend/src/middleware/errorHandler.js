export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

export function errorHandler(err, req, res, next) {
  const message = err && err.message ? String(err.message) : 'Erro interno do servidor';
  res.status(500).json({ error: message });
}

