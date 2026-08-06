/**
 * Build a safe file URL for browser viewing.
 * Cloudinary URLs → return as-is
 * Local paths → prefix with backend base URL
 */
const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const fileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
