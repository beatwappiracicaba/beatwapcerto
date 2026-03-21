import { API_BASE_URL } from '../config/apiConfig.js';

const DEFAULT_TIMEOUT_MS_GET = 30000;
const DEFAULT_TIMEOUT_MS_MUTATION = 45000;
const PROD_FALLBACK_BASE_URL = 'https://api.beatwap.com.br';
let LAST_BASE_URL = null;
const inflightRequests = new Map();
const responseCache = new Map();
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
    ...(!((options.headers || {}).Accept || (options.headers || {}).accept) ? { Accept: 'application/json' } : {}),
    ...(shouldSendJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const hasAuthHeader = !!headers.Authorization;
  const cacheMode = options.cache ?? (!hasAuthHeader && (method === 'GET' || method === 'HEAD'));
  const cacheTtlMs = Number(options.cacheTtlMs ?? 5000);
  const cacheKey = cacheMode && cacheTtlMs > 0 ? `${method} ${String(path)} ${hasAuthHeader ? String(headers.Authorization) : ''}` : null;
  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const inflight = inflightRequests.get(cacheKey);
    if (inflight) return inflight;
  }

  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser && window.location ? String(window.location.hostname || '') : '';
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const defaultTimeoutMs = method === 'GET' || method === 'HEAD' ? DEFAULT_TIMEOUT_MS_GET : DEFAULT_TIMEOUT_MS_MUTATION;
  const timeoutMs = Number(options.timeoutMs ?? defaultTimeoutMs);
  const defaultPerAttemptTimeoutMs = method === 'GET' || method === 'HEAD'
    ? (isLocalHost ? 8000 : 25000)
    : (isLocalHost ? 12000 : 30000);
  const perAttemptTimeoutMs = Number(options.perAttemptTimeoutMs ?? defaultPerAttemptTimeoutMs);
  const normalizedBaseUrlRaw = API_BASE_URL
    ? String(API_BASE_URL)
        .trim()
        .replace(/^['"`\s]+|['"`\s]+$/g, '')
        .replace(/\/+$/, '')
    : '';
  const normalizedBaseUrl = normalizedBaseUrlRaw.replace(/\/api\/?$/, '');

  const baseUrls = [];
  if (isLocalHost) {
    baseUrls.push('');
  } else {
    if (!baseUrls.includes(PROD_FALLBACK_BASE_URL)) baseUrls.push(PROD_FALLBACK_BASE_URL);
    const allowSameOriginApi = hostname === 'api.beatwap.com.br';
    if (allowSameOriginApi && !baseUrls.includes('')) baseUrls.push('');
  }
  if (!isLocalHost && LAST_BASE_URL) {
    const idx = baseUrls.indexOf(LAST_BASE_URL);
    if (idx > 0) {
      baseUrls.splice(idx, 1);
      baseUrls.unshift(LAST_BASE_URL);
    } else if (idx < 0) {
      baseUrls.unshift(LAST_BASE_URL);
    }
  }

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
      const fetchOptions = { ...(options || {}) };
      delete fetchOptions.timeoutMs;
      delete fetchOptions.perAttemptTimeoutMs;
      const customCache = fetchOptions.cache;
      delete fetchOptions.cache;
      delete fetchOptions.cacheTtlMs;
      if (typeof customCache === 'string' && customCache) {
        fetchOptions.cache = customCache;
      } else if (method === 'GET' || method === 'HEAD') {
        fetchOptions.cache = 'no-store';
      }

      const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
      url = `${apiBase}${path}`;
      res = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
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
    const looksJson = res.status === 204
      || res.status === 205
      || contentType.includes('application/json')
      || contentType.includes('application/problem+json')
      || (text && (text.trim().startsWith('{') || text.trim().startsWith('[')));

    let data = null;
    if (looksJson) {
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    }

    return { res, text, data, looksJson, url };
  };

  const exec = async () => {
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
          if (result.res.status === 401) {
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            } catch {
              void 0;
            }
          }
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
          LAST_BASE_URL = baseUrl;
          return result.data.data ?? null;
        }
        const totalMs = Date.now() - startedAt;
        if (DEBUG_API || totalMs >= SLOW_API_MS) {
          console.log('[api] ok', { method, path, ms: totalMs, attempt: i + 1, url: result.url });
        }
        LAST_BASE_URL = baseUrl;
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
        // Evitar loop infinito em falhas de CORS/preflight (TypeError/Fetched blocked)
        const isCorsBlocked = (err instanceof TypeError) && /fetch|network|Failed to fetch|TypeError/i.test(String(err?.message || ''));
        const retriable = (!isCorsBlocked) && (
            err?.code === 'ETIMEDOUT'
          || err?.name === 'AbortError'
          || err instanceof TypeError
          || (err?.code === 'ENONJSON')
          || (Number(err?.status) === 404)
          || (Number(err?.status) === 405)
        );
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
  };

  if (!cacheKey) return exec();

  const promise = exec();
  inflightRequests.set(cacheKey, promise);
  try {
    const value = await promise;
    responseCache.set(cacheKey, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export const apiClient = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...(options || {}), method: 'POST', body: JSON.stringify(body) }),
  postForm: (path, formData, options) => request(path, { ...(options || {}), method: 'POST', body: formData }),
  put: (path, body, options) => request(path, { ...(options || {}), method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body, options) => request(path, { ...(options || {}), method: 'PATCH', body: JSON.stringify(body) }),
  del: (path, options) => request(path, { ...(options || {}), method: 'DELETE' }),
};

export const authApi = {
  async login(email, password) {
    const data = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    let user = data.user;
    if (!user && data?.token) {
      try {
        const payloadRaw = String(data.token).split('.')[1] || '';
        const normalized = payloadRaw.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(normalized));
        user = { id: decoded?.sub || null, email: decoded?.email || null, cargo: decoded?.cargo || null };
      } catch {
        user = null;
      }
    }
    if (user) localStorage.setItem('user', JSON.stringify(user));
    return data;
  },
  async requestRegisterCode(email) {
    return apiClient.post('/auth/register/request-code', { email });
  },
  async register(payload) {
    const planValue = payload?.plano ?? payload?.plan;
    const body = { ...(payload || {}) };
    if (planValue != null) body.plano = planValue;
    return apiClient.post('/auth/register', body);
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
  sellers: () => apiClient.get('/profiles?role=seller'),
  artists: () => apiClient.get('/profiles?role=artist'),
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
  async uploadWithMeta(file, { fileName, bucket, onProgress } = {}) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    if (fileName) formData.append('fileName', fileName);
    if (bucket) formData.append('bucket', bucket);

    const normalizedBaseUrlRaw = API_BASE_URL
      ? String(API_BASE_URL)
          .trim()
          .replace(/^['"`\s]+|['"`\s]+$/g, '')
          .replace(/\/+$/, '')
      : '';
    const normalizedBaseUrl = normalizedBaseUrlRaw.replace(/\/api\/?$/, '');
    const hostname = typeof window !== 'undefined' && window.location ? String(window.location.hostname || '') : '';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const baseUrls = [];
    if (isLocalHost) {
      if (!baseUrls.includes('')) baseUrls.push('');
      if (!baseUrls.includes('http://localhost:3011')) baseUrls.push('http://localhost:3011');
      if (!baseUrls.includes('http://localhost:3000')) baseUrls.push('http://localhost:3000');
      if (!baseUrls.includes('http://localhost:3001')) baseUrls.push('http://localhost:3001');
      if (normalizedBaseUrl && !baseUrls.includes(normalizedBaseUrl)) baseUrls.push(normalizedBaseUrl);
    } else {
      if (normalizedBaseUrl && !baseUrls.includes(normalizedBaseUrl)) baseUrls.push(normalizedBaseUrl);
    }
    if (!baseUrls.includes(PROD_FALLBACK_BASE_URL)) baseUrls.push(PROD_FALLBACK_BASE_URL);

    const runMultipart = async () => {
      if (typeof onProgress !== 'function' || typeof XMLHttpRequest === 'undefined') {
        return apiClient.postForm('/upload/single', formData, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      }

      let lastErr = null;
      for (let i = 0; i < baseUrls.length; i += 1) {
        const baseUrl = baseUrls[i];
        const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
        const url = `${apiBase}/upload/single`;
        try {
          const res = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.responseType = 'text';
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.upload.onprogress = (evt) => {
              if (!evt.lengthComputable) return;
              const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
              onProgress(pct);
            };
            xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
            xhr.onerror = () => reject(new Error('Falha de rede'));
            xhr.onabort = () => reject(new Error('Upload cancelado'));
            xhr.send(formData);
          });

          let data = null;
          try { data = res.text ? JSON.parse(res.text) : null; } catch { data = null; }
          if (res.status < 200 || res.status >= 300) throw new Error((data && data.error) || 'Falha no upload');
          if (!data?.url) throw new Error('Falha no upload');
          return data;
        } catch (e) {
          lastErr = e;
          const hasNext = i < baseUrls.length - 1;
          if (!hasNext) throw e;
        }
      }
      throw lastErr || new Error('Falha no upload');
    };

    try {
      const res = await runMultipart();
      if (res?.url) return res;
      throw new Error('Falha multipart');
    } catch {
      const toDataUrl = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(f);
      });
      const dataUrl = await toDataUrl(file);
      const payload = { fileName, bucket, dataUrl };
      const out = await apiClient.post('/upload/base64', payload);
      if (typeof onProgress === 'function') onProgress(100);
      return out;
    }
  },
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const normalizedBaseUrl = (API_BASE_URL ? String(API_BASE_URL).trim().replace(/\/+$/, '') : '').replace(/\/api\/?$/, '');
    const hostname = typeof window !== 'undefined' && window.location ? String(window.location.hostname || '') : '';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const baseUrls = [];
    if (isLocalHost) {
      if (!baseUrls.includes('')) baseUrls.push('');
      if (!baseUrls.includes('http://localhost:3011')) baseUrls.push('http://localhost:3011');
      if (!baseUrls.includes('http://localhost:3000')) baseUrls.push('http://localhost:3000');
      if (!baseUrls.includes('http://localhost:3001')) baseUrls.push('http://localhost:3001');
      if (normalizedBaseUrl && !baseUrls.includes(normalizedBaseUrl)) baseUrls.push(normalizedBaseUrl);
    } else {
      if (normalizedBaseUrl && !baseUrls.includes(normalizedBaseUrl)) baseUrls.push(normalizedBaseUrl);
    }
    if (!baseUrls.includes(PROD_FALLBACK_BASE_URL)) baseUrls.push(PROD_FALLBACK_BASE_URL);

    const run = async () => {
      let lastErr = null;
      for (let i = 0; i < baseUrls.length; i += 1) {
        const baseUrl = baseUrls[i];
        const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
        const url = `${apiBase}/upload/single`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const text = await res.text();
          let data = null;
          try { data = text ? JSON.parse(text) : null; } catch { data = null; }
          if (!res.ok) throw new Error((data && data.error) || res.statusText);
          if (data == null) throw new Error('API respondeu em formato inválido (não-JSON).');
          return data;
        } catch (e) {
          lastErr = e;
          const hasNext = i < baseUrls.length - 1;
          if (!hasNext) throw e;
        }
      }
      throw lastErr || new Error('Falha ao enviar arquivo');
    };

    return run();
  },
  uploadMultiple: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const token = localStorage.getItem('token');
    const normalizedBaseUrl = (API_BASE_URL
      ? String(API_BASE_URL)
          .trim()
          .replace(/^['"`\s]+|['"`\s]+$/g, '')
          .replace(/\/+$/, '')
      : ''
    ).replace(/\/api\/?$/, '');
    const hostname = typeof window !== 'undefined' && window.location ? String(window.location.hostname || '') : '';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const baseUrls = [];
    if (isLocalHost) {
      if (!baseUrls.includes('')) baseUrls.push('');
      if (!baseUrls.includes('http://localhost:3011')) baseUrls.push('http://localhost:3011');
      if (!baseUrls.includes('http://localhost:3000')) baseUrls.push('http://localhost:3000');
      if (!baseUrls.includes('http://localhost:3001')) baseUrls.push('http://localhost:3001');
      if (normalizedBaseUrl && !baseUrls.includes(normalizedBaseUrl)) baseUrls.push(normalizedBaseUrl);
    } else {
      if (normalizedBaseUrl && !baseUrls.includes(normalizedBaseUrl)) baseUrls.push(normalizedBaseUrl);
    }
    if (!baseUrls.includes(PROD_FALLBACK_BASE_URL)) baseUrls.push(PROD_FALLBACK_BASE_URL);

    const run = async () => {
      let lastErr = null;
      for (let i = 0; i < baseUrls.length; i += 1) {
        const baseUrl = baseUrls[i];
        const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
        const url = `${apiBase}/upload/multiple`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const text = await res.text();
          let data = null;
          try { data = text ? JSON.parse(text) : null; } catch { data = null; }
          if (!res.ok) throw new Error((data && data.error) || res.statusText);
          if (data == null) throw new Error('API respondeu em formato inválido (não-JSON).');
          return data;
        } catch (e) {
          lastErr = e;
          const hasNext = i < baseUrls.length - 1;
          if (!hasNext) throw e;
        }
      }
      throw lastErr || new Error('Falha ao enviar arquivos');
    };

    return run();
  }
};
