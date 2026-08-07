const API  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Returns server endpoints (no token embedded).
 * For external URLs (Cloudinary etc) return as-is.
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
