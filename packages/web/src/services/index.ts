import api from './api';

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then(r => r.data.data),
  register: (data: any) => api.post('/auth/register', data).then(r => r.data.data),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }).then(r => r.data.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  getProfile: () => api.get('/auth/me').then(r => r.data.data),
};

export const productsService = {
  list: (params?: any) => api.get('/products', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/products/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/products', data).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const batchesService = {
  list: (params?: any) => api.get('/batches', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/batches/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/batches', data).then(r => r.data.data),
  updateStatus: (id: string, status: string) => api.patch(`/batches/${id}/status`, { status }).then(r => r.data.data),
  getTimeline: (id: string) => api.get(`/batches/${id}/timeline`).then(r => r.data.data),
  getPassport: (id: string) => api.get(`/batches/${id}/passport`).then(r => r.data.data),
};

export const transfersService = {
  list: (params?: any) => api.get('/transfers', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/transfers/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/transfers', data).then(r => r.data.data),
  dispatch: (id: string) => api.patch(`/transfers/${id}/dispatch`).then(r => r.data.data),
  receive: (id: string) => api.patch(`/transfers/${id}/receive`).then(r => r.data.data),
  reject: (id: string, reason?: string) => api.patch(`/transfers/${id}/reject`, { reason }).then(r => r.data.data),
};

export const qrService = {
  generate: (data: any) => api.post('/qr/generate', data).then(r => r.data.data),
  verify: (token: string) => api.get(`/qr/verify/${token}`).then(r => r.data.data),
  listByBatch: (batchId: string) => api.get(`/qr/batch/${batchId}`).then(r => r.data.data),
  revoke: (id: string) => api.post(`/qr/${id}/revoke`).then(r => r.data.data),
  getScanHistory: (id: string) => api.get(`/qr/${id}/scans`).then(r => r.data.data),
};

export const riskService = {
  getDashboard: () => api.get('/risk/dashboard').then(r => r.data.data),
  getBatches: (params?: any) => api.get('/risk/batches', { params }).then(r => r.data),
  getBatchRisk: (batchId: string) => api.get(`/risk/batch/${batchId}`).then(r => r.data.data),
  assessBatch: (batchId: string) => api.post(`/risk/assess/${batchId}`).then(r => r.data.data),
};

export const investigationsService = {
  list: (params?: any) => api.get('/investigations', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/investigations/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/investigations', data).then(r => r.data.data),
  updateStatus: (id: string, data: any) => api.patch(`/investigations/${id}/status`, data).then(r => r.data.data),
  assign: (id: string, assignedTo: string) => api.patch(`/investigations/${id}/assign`, { assignedTo }).then(r => r.data.data),
  generateReport: (id: string) => api.post(`/investigations/${id}/report`).then(r => r.data.data),
};

export const analyticsService = {
  getOverview: () => api.get('/analytics/overview').then(r => r.data.data),
  getSupplyChain: () => api.get('/analytics/supply-chain').then(r => r.data.data),
  getRisk: () => api.get('/analytics/risk').then(r => r.data.data),
};

export const usersService = {
  list: (params?: any) => api.get('/users', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/users/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/users', data).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data).then(r => r.data.data),
  updateStatus: (id: string, isActive: boolean) => api.patch(`/users/${id}/status`, { isActive }).then(r => r.data.data),
};

export const tenantsService = {
  list: (params?: any) => api.get('/tenants', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/tenants/${id}`).then(r => r.data.data),
  update: (id: string, data: any) => api.put(`/tenants/${id}`, data).then(r => r.data.data),
  updateStatus: (id: string, status: string) => api.patch(`/tenants/${id}/status`, { status }).then(r => r.data.data),
};

export const notificationsService = {
  list: (params?: any) => api.get('/notifications', { params }).then(r => r.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then(r => r.data.data.unreadCount),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

