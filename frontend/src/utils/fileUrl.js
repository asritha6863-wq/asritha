/**
 * fileUrl.js
 * Returns the full URL for a stored file path.
 * Handles both local dev and production (Render).
 */
const BACKEND = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export const fileUrl = (filePath) => {
  if (!filePath) return '';
  // Remove leading slash if present to avoid double slash
  const clean = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  return `${BACKEND}/${clean}`;
};
