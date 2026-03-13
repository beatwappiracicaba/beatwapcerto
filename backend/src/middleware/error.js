function errorHandler(err, req, res, next) {
  const status = Number(err && err.status) || 500;
  const message = status >= 500 ? 'Erro interno' : String(err && err.message ? err.message : 'Erro');
  if (res.headersSent) return next(err);
  return res.status(status).json({ success: false, error: message });
}

module.exports = { errorHandler };
