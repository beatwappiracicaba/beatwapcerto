let sentryEnabled = false;
function setupSentry(app) {
  try {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production'
    });
    const handlers = Sentry.Handlers || {};
    if (handlers.requestHandler) app.use(handlers.requestHandler());
    sentryEnabled = true;
  } catch {
    sentryEnabled = false;
  }
}

function useSentryErrorHandler(app) {
  try {
    if (!sentryEnabled) return;
    const Sentry = require('@sentry/node');
    const handlers = Sentry.Handlers || {};
    if (handlers.errorHandler) app.use(handlers.errorHandler());
  } catch {}
}

module.exports = { setupSentry, useSentryErrorHandler };
