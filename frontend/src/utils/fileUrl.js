/**
 * Build a URL to view a file.
 * All files are served through the backend /api/files/serve endpoint
 * which streams from disk with correct Content-Type headers.
 * The JWT token is sent automatically via the Authorization header in axios,
 * but since we use <a href> links we pass token as query param.
 */
const API  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('erp_token') || '';

export const fileUrl = (filePath) => {
  if (!filePath) return '';
  // Already a full external URL (old Cloudinary links) — return as-is
  if (filePath.startsWith('http')) return filePath;
  // Local path — serve through backend with auth token
  const token = getToken();
  return `${API}/files/serve?p=${encodeURIComponent(filePath)}&token=${token}`;
};

export const isLocalPath = (p) => !!p && !p.startsWith('http');
