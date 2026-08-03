import api from './api';

const notificationService = {
  getAll:       (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: ()          => api.get('/notifications/unread-count'),
  markRead:     (id)          => api.patch(`/notifications/${id}/read`),
  markAllRead:  ()            => api.patch('/notifications/mark-all-read'),
  clearAll:     ()            => api.delete('/notifications/clear-all'),
};

export default notificationService;
