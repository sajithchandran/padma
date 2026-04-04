import axios from 'axios';

// All requests go to Next.js /api/* which is proxied to the backend
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject tenant/auth headers from session storage (populated after login)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token    = sessionStorage.getItem('padma_token');
    const tenantId = sessionStorage.getItem('padma_tenant_id');
    const userId   = sessionStorage.getItem('padma_user_id');
    const userRole = sessionStorage.getItem('padma_user_role');

    if (token)    config.headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) config.headers['x-tenant-id']  = tenantId;
    if (userId)   config.headers['x-user-id']    = userId;
    if (userRole) config.headers['x-user-roles'] = userRole;
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
