import { API_BASE_URL } from '../config/apiConfig.js';

const DEFAULT_TIMEOUT_MS = 45000;
const PROD_FALLBACK_BASE_URL = 'https://api.beatwap.com.br';
const DEBUG_API = (() => {
  try {
    const v = import.meta?.env?.VITE_DEBUG_API;
    if (v != null) return String(v).toLowerCase() === 'true' || String(v) === '1';
    return !!import.meta?.env?.DEV;
  } catch {
    return false;
  }
})();
const SLOW_API_MS = 2500;

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const method = String(options.method || 'GET').toUpperCase();
  const shouldSendJsonContentType = !!options.body && typeof options.body === 'string' && method !== 'GET' && method !== 'HEAD';
  const headers = {
    ...(options.headers || {}),
    ...(shouldSendJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const perAttemptTimeoutMs = Number(options.perAttemptTimeoutMs ?? 8000);
  const normalizedBaseUrl = API_BASE_URL ? String(API_BASE_URL).trim().replace(/\/+$/, '') : '';

  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser && window.location ? String(window.location.hostname || '') : '';
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const baseUrls = [];
  if (normalizedBaseUrl) baseUrls.push(normalizedBaseUrl);
  if (!baseUrls.includes('')) baseUrls.push('');
  if (!isLocalHost && !baseUrls.includes(PROD_FALLBACK_BASE_URL)) baseUrls.push(PROD_FALLBACK_BASE_URL);

  const deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? (Date.now() + timeoutMs) : null;

  const attempt = async (baseUrl, remainingMs) => {
    const controller = new AbortController();
    const timeoutId = Number.isFinite(remainingMs) && remainingMs > 0
      ? setTimeout(() => controller.abort(), remainingMs)
      : null;

    let res;
    let text = '';
    let url = '';
    try {
      const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
      url = `${apiBase}${path}`;
      res = await fetch(url, { ...options, headers, signal: controller.signal });
      text = await res.text();
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        const e = new Error('Tempo esgotado ao conectar na API');
        e.code = 'ETIMEDOUT';
        e.url = url;
        throw e;
      }
      if (url) err.url = url;
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const contentType = String(res.headers.get('content-type') || '').toLowerCase();
    const looksJson = contentType.includes('application/json') || (text && (text.trim().startsWith('{') || text.trim().startsWith('[')));

    let data = null;
    if (looksJson) {
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    }

    return { res, text, data, looksJson, url };
  };

  const startedAt = Date.now();
  const attempts = [];
  let last = null;
  for (let i = 0; i < baseUrls.length; i += 1) {
    const baseUrl = baseUrls[i];
    const overallRemainingMs = deadline ? Math.max(1, deadline - Date.now()) : timeoutMs;
    const isLastAttempt = i === baseUrls.length - 1;
    const budgetMs = (!isLastAttempt && Number.isFinite(perAttemptTimeoutMs) && perAttemptTimeoutMs > 0)
      ? Math.min(overallRemainingMs, perAttemptTimeoutMs)
      : overallRemainingMs;
    const attemptStart = Date.now();
    try {
      const result = await attempt(baseUrl, budgetMs);
      const ms = Date.now() - attemptStart;
      attempts.push({ baseUrl, url: result.url, ok: result.res.ok, status: result.res.status, ms });
      if (!result.res.ok) {
        const e = new Error((result.data && result.data.error) || result.res.statusText || 'Falha na API');
        e.status = result.res.status;
        e.url = result.url;
        e.response = result.data;
        throw e;
      }
      if (!result.looksJson) {
        const e = new Error('API respondeu em formato inválido (não-JSON).');
        e.code = 'ENONJSON';
        e.status = result.res.status;
        e.url = result.url;
        e.contentType = String(result.res.headers.get('content-type') || '');
        e.preview = result.text ? String(result.text).slice(0, 160) : '';
        throw e;
      }
      if (result.data && typeof result.data === 'object' && 'success' in result.data && 'data' in result.data) {
        const totalMs = Date.now() - startedAt;
        if (DEBUG_API || totalMs >= SLOW_API_MS) {
          console.log('[api] ok', { method, path, ms: totalMs, attempt: i + 1, url: result.url });
        }
        return result.data.data ?? null;
      }
      const totalMs = Date.now() - startedAt;
      if (DEBUG_API || totalMs >= SLOW_API_MS) {
        console.log('[api] ok', { method, path, ms: totalMs, attempt: i + 1, url: result.url });
      }
      return result.data;
    } catch (err) {
      const ms = Date.now() - attemptStart;
      if (!attempts.some(a => a.baseUrl === baseUrl && a.ms === ms)) {
        attempts.push({
          baseUrl,
          url: err?.url || (baseUrl ? `${baseUrl}/api${path}` : `/api${path}`),
          ok: false,
          status: err?.status || null,
          ms,
          error: String(err?.message || err)
        });
      }
      last = err;
      const retriable = err?.code === 'ETIMEDOUT'
        || err?.name === 'AbortError'
        || err instanceof TypeError
        || (!normalizedBaseUrl && baseUrl === '' && err?.code === 'ENONJSON')
        || (!normalizedBaseUrl && baseUrl === '' && Number(err?.status) === 404);
      const hasNext = i < baseUrls.length - 1;
      if (DEBUG_API) {
        console.warn('[api] attempt failed', {
          method,
          path,
          attempt: i + 1,
          retriable,
          ms,
          url: err?.url || null,
          status: err?.status || null,
          error: String(err?.message || err)
        });
      }
      if (!retriable || !hasNext) throw err;
    }
  }

  const totalMs = Date.now() - startedAt;
  console.error('[api] failed', {
    method,
    path,
    ms: totalMs,
    timeoutMs,
    perAttemptTimeoutMs,
    attempts,
    error: last ? { name: last?.name, code: last?.code, status: last?.status, message: String(last?.message || last) } : null
  });
  throw last || new Error('Falha ao conectar na API');
}

export const apiClient = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...(options || {}), method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, options) => request(path, { ...(options || {}), method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body, options) => request(path, { ...(options || {}), method: 'PATCH', body: JSON.stringify(body) }),
  del: (path, options) => request(path, { ...(options || {}), method: 'DELETE' }),
};

export const authApi = {
  async login(email, password) {
    const data = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },
  async register({ name, email, password, role, plano, plan }) {
    const planValue = plano ?? plan;
    return apiClient.post('/auth/register', { name, email, password, role, plano: planValue });
  },
  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getToken() {
    return localStorage.getItem('token');
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  }
};

export const homeApi = {
  releases: () => apiClient.get('/releases'),
  compositions: () => apiClient.get('/compositions'),
  projects: () => apiClient.get('/projects'),
  sponsors: () => apiClient.get('/sponsors'),
  composers: () => apiClient.get('/composers'),
  producers: () => apiClient.get('/producers'),
  sellers: () => apiClient.get('/users?role=Vendedor'),
  artists: () => apiClient.get('/artists'),
};

export const musicApi = {
  getAll: () => apiClient.get('/musics'),
  getById: (id) => apiClient.get(`/musics/${id}`),
  create: (data) => apiClient.post('/musics', data),
  update: (id, data) => apiClient.put(`/musics/${id}`, data),
  delete: (id) => apiClient.del(`/musics/${id}`),
};

export const profileApi = {
  getById: (userId) => apiClient.get(`/profiles/${userId}`),
  update: (data) => apiClient.put('/profiles', data),
  getArtists: () => apiClient.get('/profiles/artists/all'),
};

export const projectApi = {
  getAll: () => apiClient.get('/projects'),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.put(`/projects/${id}`, data),
  delete: (id) => apiClient.del(`/projects/${id}`),
};

export const eventApi = {
  getAll: () => apiClient.get('/events'),
  getById: (id) => apiClient.get(`/events/${id}`),
  create: (data) => apiClient.post('/events', data),
  update: (id, data) => apiClient.put(`/events/${id}`, data),
  delete: (id) => apiClient.del(`/events/${id}`),
};

export const uploadApi = {
  async uploadWithMeta(file, { fileName, bucket } = {}) {
    const formData = new FormData();
    if (fileName) formData.append('fileName', fileName);
    if (bucket) formData.append('bucket', bucket);
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const normalizedBaseUrl = API_BASE_URL ? String(API_BASE_URL).trim().replace(/\/+$/, '') : '';
    const apiBase = normalizedBaseUrl ? `${normalizedBaseUrl}/api` : '/api';

    const res = await fetch(`${apiBase}/upload`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new Error((data && data.error) || res.statusText);
    return data;
  },
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/api/upload/single`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json());
  },
  uploadMultiple: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return fetch(`${API_BASE_URL}/api/upload/multiple`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json());
  }
};
