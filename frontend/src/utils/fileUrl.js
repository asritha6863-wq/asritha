/**
 * File URL helpers.
 * Files are served via /api/files/serve (inline view) or /api/files/download (force download).
 * The backend reads the JWT from Authorization header via axios interceptor.
 * For <a href> links we use the serve endpoint — the browser sends the request
 * and the backend auth middleware checks the token from query param.
 */
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('erp_token') || '';

/**
 * Returns a URL to view/open the file inline in browser.
 * For external URLs (old Cloudinary links) returns as-is.
 */
export const fileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  const token = getToken();
  return `${API}/files/serve?p=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
};

/**
 * Returns server endpoints without embedding token (for use with fetch + Authorization header).
 */
export const serveUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  return `${API}/files/serve?p=${encodeURIComponent(filePath)}`;
};

export const downloadUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  return `${API}/files/download?p=${encodeURIComponent(filePath)}`;
};

export const isLocalPath = (p) => !!p && !p.startsWith('http');
