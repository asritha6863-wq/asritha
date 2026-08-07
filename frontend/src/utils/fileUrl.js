/**
 * All files — local disk OR Cloudinary URLs — go through /api/files/serve.
 * The backend fetches Cloudinary URLs server-side and streams them to the browser
 * with correct Content-Type and CORS headers, bypassing all Cloudinary restrictions.
 */
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('erp_token') || '';

export const fileUrl = (filePath) => {
  if (!filePath) return '';
  const token = getToken();
  return `${API}/files/serve?p=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
};

export const serveUrl   = fileUrl;
export const downloadUrl = (filePath) => {
  if (!filePath) return '';
  const token = getToken();
  return `${API}/files/download?p=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
};

export const isLocalPath = (p) => !!p && !p.startsWith('http');
