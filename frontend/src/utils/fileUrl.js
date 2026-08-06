/**
 * Build a proxy URL for file viewing.
 * All files go through the backend proxy (/api/files/proxy?url=...)
 * which fetches from Cloudinary using server credentials, bypassing access restrictions.
 * Local paths are served directly from the backend static files.
 */
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE = API.replace('/api', '');

export const fileUrl = (path) => {
  if (!path) return '';
  // Full Cloudinary URL — proxy through backend
  if (path.startsWith('http')) {
    return `${API}/files/proxy?url=${encodeURIComponent(path)}`;
  }
  // Local path — serve directly from backend
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
