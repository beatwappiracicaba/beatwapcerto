import { API_BASE_URL } from '../config/apiConfig.js';

const DEFAULT_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const normalizedBaseUrl = API_BASE_URL ? String(API_BASE_URL).trim().replace(/\/+$/, '') : '';

  const attempt = async (baseUrl) => {
    const controller = new AbortController();
    const timeoutId = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    let res;
    let text = '';
    try {
      const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
      res = await fetch(`${apiBase}${path}`, { ...options, headers, signal: controller.signal });
      text = await res.text();
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('Tempo esgotado ao conectar na API');
      }
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

    return { res, text, data, looksJson };
  };

  const primary = await attempt(normalizedBaseUrl);
  if (!primary.res.ok) throw new Error((primary.data && primary.data.error) || primary.res.statusText);
  if (!primary.looksJson) throw new Error('API respondeu em formato inválido (não-JSON).');
  if (primary.data && typeof primary.data === 'object' && 'success' in primary.data && 'data' in primary.data) {
    return primary.data.data ?? null;
  }
  return primary.data;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export const authApi = {
  async login(email, password) {
    const data = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },
  async register({ name, email, password, role }) {
    return apiClient.post('/auth/register', { name, email, password, role });
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
    formData.append('file', file);
    if (fileName) formData.append('fileName', fileName);
    if (bucket) formData.append('bucket', bucket);

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
