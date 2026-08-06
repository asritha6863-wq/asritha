/**
 * Build a safe file URL for viewing in browser.
 * - Cloudinary URLs → returned as-is (full https://)
 * - Local relative paths → prefixed with backend base URL
 *
 * Note: Cloudinary raw/upload files open directly in browser when clicked
 * with target="_blank" — no transformation needed.
 */
const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const fileUrl = (path) => {
  if (!path) return '';
  // Already a full URL (Cloudinary or external) — use as-is
  if (path.startsWith('http')) return path;
  // Local path — prefix with backend URL
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
