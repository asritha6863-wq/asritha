/**
 * Build a safe file URL for browser viewing.
 *
 * Cloudinary raw/upload URLs → publicly accessible, use directly
 * Cloudinary image/upload PDFs (old uploads) → route through backend proxy
 * Local paths → prefix with backend base URL
 */
const API  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE = API.replace('/api', '');

export const fileUrl = (path) => {
  if (!path) return '';

  if (path.startsWith('http')) {
    if (path.includes('res.cloudinary.com')) {
      // raw/upload URLs are publicly accessible — use directly
      if (path.includes('/raw/upload/')) return path;
      // image/upload PDFs — proxy through backend (image type PDFs are 401 on free plan)
      if (path.includes('/image/upload/') && path.toLowerCase().includes('.pdf')) {
        return `${API}/files/proxy?url=${encodeURIComponent(path)}`;
      }
      // Other image types (jpg, png) — use directly
      return path;
    }
    return path;
  }

  // Local path
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
