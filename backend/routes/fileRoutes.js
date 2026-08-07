const express  = require('express');
const router   = express.Router();
const https    = require('https');
const http     = require('http');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * GET /api/files/proxy?url=<encoded-url>
 * Streams a file through the backend using a signed Cloudinary URL.
 * Requires JWT authentication so only logged-in users can access files.
 */
router.get('/proxy', protect, asyncHandler(async (req, res, next) => {
  const { url } = req.query;
  if (!url) return next(new ErrorResponse('url param required', 400));

  let rawUrl;
  try { rawUrl = decodeURIComponent(url); } catch { return next(new ErrorResponse('Invalid URL', 400)); }

  // Local file — redirect to static
  if (!rawUrl.startsWith('http')) {
    const BASE = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`);
    return res.redirect(`${BASE}/${rawUrl}`);
  }

  // Only proxy Cloudinary URLs
  if (!rawUrl.includes('res.cloudinary.com')) {
    return next(new ErrorResponse('Only Cloudinary URLs allowed', 403));
  }

  // Extract public_id and resource_type from URL and generate a signed URL
  // URL format: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/public_id.ext
  const match = rawUrl.match(/res\.cloudinary\.com\/([^/]+)\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return next(new ErrorResponse('Cannot parse Cloudinary URL', 400));

  const [, , resourceType, publicIdWithExt] = match;
  // Remove extension from public_id for signing
  const publicId = publicIdWithExt.replace(/\.[^.]+$/, '');
  const ext      = publicIdWithExt.includes('.') ? publicIdWithExt.split('.').pop() : '';

  // Generate a signed delivery URL valid for 2 hours
  const signedUrl = cloudinary.url(publicId, {
    resource_type : resourceType,
    type          : 'upload',
    sign_url      : true,
    secure        : true,
    expires_at    : Math.floor(Date.now() / 1000) + 7200,
    format        : ext || undefined,
  });

  // Determine MIME type for response header
  const mimeMap = { pdf:'application/pdf', jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  const mime = mimeMap[ext?.toLowerCase()] || 'application/octet-stream';

  const lib = signedUrl.startsWith('https') ? https : http;
  lib.get(signedUrl, (fileRes) => {
    if (fileRes.statusCode >= 400) {
      // Stream failed — redirect directly so browser tries
      return res.redirect(rawUrl);
    }
    res.setHeader('Content-Type', fileRes.headers['content-type'] || mime);
    res.setHeader('Content-Disposition', `inline; filename="${publicIdWithExt}"`);
    if (fileRes.headers['content-length']) res.setHeader('Content-Length', fileRes.headers['content-length']);
    res.setHeader('Cache-Control', 'private, max-age=7200');
    fileRes.pipe(res);
  }).on('error', () => res.redirect(rawUrl));
}));

module.exports = router;
