function readEnv(name, { required = false, fallback = undefined } = {}) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') {
    if (required) throw new Error(`Missing env var: ${name}`);
    return fallback;
  }
  return String(raw);
}

const config = {
  nodeEnv: readEnv('NODE_ENV', { fallback: 'production' }),
  port: Number(readEnv('PORT', { fallback: '3000' })),
  databaseUrl: readEnv('DATABASE_URL', { required: true }),
  jwtSecret: readEnv('JWT_SECRET', { required: true }),
  corsOrigin: readEnv('CORS_ORIGIN', { fallback: '*' })
};

module.exports = { config };
