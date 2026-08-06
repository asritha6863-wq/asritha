/**
 * Build a safe file URL for viewing in browser.
 * - Cloudinary URLs → returned as-is (already full https://)
 *   Special case: /raw/upload/ PDFs get fl_inline flag so browser opens them inline
 * - Local relative paths (uploads/...) → prefixed with backend base URL
 */
const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const fileUrl = (path) => {
  if (!path) return '';

  if (path.startsWith('http')) {
    // Cloudinary raw upload — add inline flag so browser opens PDF/image inline
    if (path.includes('res.cloudinary.com') && path.includes('/raw/upload/')) {
      // Insert fl_inline transformation to force browser display
      return path.replace('/raw/upload/', '/raw/upload/fl_inline/');
    }
    // Cloudinary image upload with PDF extension — rewrite to raw for proper delivery
    if (path.includes('res.cloudinary.com') && path.includes('/image/upload/')) {
      return path.replace('/image/upload/', '/raw/upload/fl_inline/');
    }
    return path;
  }

  // Local path — prefix with backend URL
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
