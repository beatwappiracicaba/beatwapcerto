const ENV_API = import.meta.env.VITE_API_BASE_URL;
const normalized = ENV_API ? String(ENV_API).trim().replace(/\/+$/, '') : '';
export const API_BASE_URL = normalized;
