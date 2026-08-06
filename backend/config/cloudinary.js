const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using CLOUDINARY_URL env var (format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
// If not set, falls back to local storage (upload middleware will handle fallback)
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
  console.log('[Cloudinary] Configured successfully');
} else {
  console.warn('[Cloudinary] CLOUDINARY_URL not set — uploads will use local storage (not recommended for production)');
}

module.exports = cloudinary;
