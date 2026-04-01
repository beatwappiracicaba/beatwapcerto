const ENV_API = import.meta.env.VITE_API_BASE_URL;
const normalized = ENV_API
  ? String(ENV_API)
      .trim()
      .replace(/^['"`\s]+|['"`\s]+$/g, '')
      .replace(/\/+$/, '')
  : '';
export const API_BASE_URL = normalized.replace(/\/api\/?$/, '');

const envMP = String(import.meta?.env?.VITE_MP_CHECKOUT_ENABLED || '').trim().toLowerCase();
export const MP_CHECKOUT_ENABLED = envMP === '1' || envMP === 'true' || envMP === 'yes';
