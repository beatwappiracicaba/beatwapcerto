function errorHandler(err, req, res, next) {
  const status = Number(err && err.status) || 500;
  const message = status >= 500 ? 'Erro interno' : String(err && err.message ? err.message : 'Erro');
  if (status >= 500) {
    const safe = {
      status,
      path: req && req.originalUrl ? String(req.originalUrl) : null,
      method: req && req.method ? String(req.method) : null,
      code: err && err.code ? String(err.code) : null,
      message: err && err.message ? String(err.message) : null,
    };
    console.error('[api:error]', safe);
    if (err && err.stack) console.error(err.stack);
  }
  if (res.headersSent) return next(err);
  return res.status(status).json({ success: false, error: message });
}

module.exports = { errorHandler };
