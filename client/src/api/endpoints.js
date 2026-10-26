import { api } from './client.js';

/** Drop empty filter values so URLs stay clean (?type=&search= becomes nothing). */
const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );

const data = (response) => response.data;

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials).then(data),
  register: (details) => api.post('/auth/register', details).then(data),
  demo: () => api.post('/auth/demo').then(data),
  me: (signal) => api.get('/auth/me', { signal }).then(data),
};

export const transactionsApi = {
  list: (params, signal) => api.get('/transactions', { params: clean(params), signal }).then(data),
  get: (id, signal) => api.get(`/transactions/${id}`, { signal }).then(data),
  create: (body) => api.post('/transactions', body).then(data),
  update: (id, body) => api.put(`/transactions/${id}`, body).then(data),
  remove: (id) => api.delete(`/transactions/${id}`),
  exportCsv: (params) =>
    api.get('/transactions/export', { params: clean(params), responseType: 'blob' }),
};

export const budgetApi = {
  get: ({ year, month }, signal) =>
    api.get('/budget', { params: { year, month }, signal }).then(data),
  create: (body) => api.post('/budget', body).then(data),
  update: (body) => api.put('/budget', body).then(data),
};

export const dashboardApi = {
  get: ({ year, month }, signal) =>
    api.get('/dashboard', { params: { year, month }, signal }).then(data),
};

export const analyticsApi = {
  get: ({ months, year, month }, signal) =>
    api.get('/analytics', { params: { months, year, month }, signal }).then(data),
};
