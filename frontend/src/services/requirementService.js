import api from './api';

const requirementService = {
  // Stats for dashboard
  getStats: () => api.get('/requirements/stats'),

  // CRUD
  getAll: (params = {}) => api.get('/requirements', { params }),
  getOne: (id) => api.get(`/requirements/${id}`),
  create: (data) => api.post('/requirements', data),
  update: (id, data) => api.put(`/requirements/${id}`, data),
  remove: (id) => api.delete(`/requirements/${id}`),

  // Workflow
  submit: (id, note = '') => api.post(`/requirements/${id}/submit`, { note }),

  // Comments
  addComment: (id, text) => api.post(`/requirements/${id}/comments`, { text }),

  // Attachments
  upload: (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return api.post(`/requirements/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAttachment: (id, attId) => api.delete(`/requirements/${id}/attachments/${attId}`),
};

export default requirementService;
