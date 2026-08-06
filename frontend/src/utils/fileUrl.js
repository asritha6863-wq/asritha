/**
 * Build a safe file URL for inline browser viewing.
 *
 * Cloudinary URLs:
 *   - /image/upload/ → add fl_inline so browser opens PDF inline instead of downloading
 *   - /raw/upload/   → add fl_inline (may not work, but try)
 *   - Other https:// → return as-is
 *
 * Local paths → prefix with backend base URL
 */
const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const fileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) {
    // Cloudinary: insert fl_inline transformation so PDF opens in browser tab
    if (path.includes('res.cloudinary.com')) {
      if (path.includes('/image/upload/') && !path.includes('fl_inline')) {
        return path.replace('/image/upload/', '/image/upload/fl_inline/');
      }
      if (path.includes('/raw/upload/') && !path.includes('fl_inline')) {
        // raw type doesn't support fl_inline — use the URL as-is
        // The file will open based on browser's default for the content type
        return path;
      }
    }
    return path;
  }
  return `${BASE}/${path}`;
};

export const isLocalPath = (path) => !!path && !path.startsWith('http');
