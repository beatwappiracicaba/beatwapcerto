const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    throw new Error((data && data.error) || res.statusText);
  }
  return data;
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
    const data = await apiClient.post('/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },
  async register({ name, email, password, role }) {
    return apiClient.post('/register', { name, email, password, role });
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
  releases: () => apiClient.get('/home/releases'),
  compositions: () => apiClient.get('/home/compositions'),
  projects: () => apiClient.get('/home/projects'),
  sponsors: () => apiClient.get('/home/sponsors'),
  composers: () => apiClient.get('/home/composers'),
  producers: () => apiClient.get('/home/producers'),
  sellers: () => apiClient.get('/home/sellers'),
  artists: () => apiClient.get('/home/artists'),
};
