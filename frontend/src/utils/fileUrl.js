/**
 * Build a safe file URL.
 * Cloudinary URLs → return as-is (no transformations — they cause errors on free plan)
 * Local paths → prefix with backend base URL
 */
const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const fileUrl = (path) => {
  if (!path) return '';
  // Already a full URL — use exactly as stored, no modifications
  if (path.startsWith('http')) return path;
  // Local path
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
