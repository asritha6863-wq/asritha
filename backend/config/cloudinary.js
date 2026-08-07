const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
  console.log('[Cloudinary] Configured from CLOUDINARY_URL');
} else {
  console.warn('[Cloudinary] CLOUDINARY_URL not set — using local storage');
}

module.exports = cloudinary;
