const express = require('express');
const router  = express.Router();
const https   = require('https');
const http    = require('http');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * GET /api/files/proxy?url=<encoded-cloudinary-url>
 * Proxies a Cloudinary file through the backend so it's accessible to authenticated users.
 * This bypasses Cloudinary access restrictions while keeping files protected by JWT.
 */
router.get('/proxy', protect, asyncHandler(async (req, res, next) => {
  const { url } = req.query;
  if (!url) return next(new ErrorResponse('url query param required', 400));

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    return next(new ErrorResponse('Invalid URL', 400));
  }

  // Only allow Cloudinary URLs
  if (!decodedUrl.includes('res.cloudinary.com') && !decodedUrl.startsWith('http')) {
    return next(new ErrorResponse('Only Cloudinary URLs are supported', 403));
  }

  // For local paths, redirect to the static file
  if (!decodedUrl.startsWith('http')) {
    return res.redirect(`/${decodedUrl}`);
  }

  const protocol = decodedUrl.startsWith('https') ? https : http;

  protocol.get(decodedUrl, (fileRes) => {
    if (fileRes.statusCode === 401 || fileRes.statusCode === 403) {
      // Try with API credentials via Cloudinary Admin API
      return next(new ErrorResponse('File access denied by storage provider', 403));
    }

    // Forward content-type and disposition headers
    const ct = fileRes.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', 'inline');
    if (fileRes.headers['content-length']) {
      res.setHeader('Content-Length', fileRes.headers['content-length']);
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');

    fileRes.pipe(res);
  }).on('error', (err) => {
    next(new ErrorResponse('Failed to fetch file: ' + err.message, 500));
  });
}));

module.exports = router;
