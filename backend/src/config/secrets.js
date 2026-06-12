const REQUIRED_SECRET_KEYS = ['JWT_SECRET', 'EMAIL_CODE_SECRET', 'ANALYTICS_SALT'];

function requireSecret(key) {
  const value = String(process.env[key] || '').trim();
  if (!value) {
    throw new Error(`Missing required secret: ${key}`);
  }
  return value;
}

function getJwtSecret() {
  return requireSecret('JWT_SECRET');
}

function getEmailCodeSecret() {
  return requireSecret('EMAIL_CODE_SECRET');
}

function getAnalyticsSalt() {
  return requireSecret('ANALYTICS_SALT');
}

function validateRequiredSecrets() {
  REQUIRED_SECRET_KEYS.forEach(requireSecret);
}

module.exports = {
  getAnalyticsSalt,
  getEmailCodeSecret,
  getJwtSecret,
  validateRequiredSecrets
};
