const API_BASE = 'https://beatwapproducoes.onrender.com/api';

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
  releases: () => apiClient.get('/releases'),
  compositions: () => apiClient.get('/compositions'),
  projects: () => apiClient.get('/projects'),
  sponsors: () => apiClient.get('/sponsors'),
  composers: () => apiClient.get('/compositions'),
  producers: () => apiClient.get('/producers'),
  sellers: () => apiClient.get('/users?role=Vendedor'),
  artists: () => apiClient.get('/profiles/artists/all'),
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
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`https://beatwapproducoes.onrender.com/api/upload/single`, {
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
    return fetch(`https://beatwapproducoes.onrender.com/api/upload/multiple`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json());
  }
};
