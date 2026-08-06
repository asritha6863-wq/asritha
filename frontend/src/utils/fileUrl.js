/**
 * Build a safe file URL.
 * - Cloudinary URLs (https://res.cloudinary.com/...) → returned as-is
 *   with /image/upload/ → /raw/upload/ fix for PDFs
 * - Local relative paths (uploads/...) → prefixed with backend base URL
 */
const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const fileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) {
    // Fix Cloudinary PDF stored under /image/ resource type → use /raw/ for correct delivery
    if (path.includes('res.cloudinary.com') && path.includes('/image/upload/') &&
        path.toLowerCase().includes('.pdf')) {
      return path.replace('/image/upload/', '/raw/upload/');
    }
    return path;
  }
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
