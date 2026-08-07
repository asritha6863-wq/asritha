const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { protect } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

// Middleware that accepts token from query param OR Authorization header
const fileAuth = asyncHandler(async (req, res, next) => {
  let token = req.query.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next(new ErrorResponse('Not authorized', 401));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return next(new ErrorResponse('User not found', 401));
    next();
  } catch {
    return next(new ErrorResponse('Invalid token', 401));
  }
});
const asyncHandler2 = null; // placeholder to keep structure

const MIME_MAP = {
  pdf:  'application/pdf',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  gif:  'image/gif',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * GET /api/files/serve?p=uploads/requirements/filename.pdf
 * Streams a file from local disk to the browser with correct Content-Type.
 * Requires JWT — only logged-in users can view files.
 */
router.get('/serve', fileAuth, asyncHandler(async (req, res, next) => {
  const { p } = req.query;
  if (!p) return next(new ErrorResponse('File path required', 400));

  const CORS = {
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'private, max-age=3600',
  };

  // ── Cloudinary URL — use Admin API to download and stream ────────────────
  if (p.startsWith('http') && p.includes('cloudinary.com')) {
    const match = p.match(/res\.cloudinary\.com\/([^/]+)\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return next(new ErrorResponse('Cannot parse Cloudinary URL', 400));

    const [, , resourceType, publicIdRaw] = match;
    const cloudinary = require('../config/cloudinary');

    const urlNoQuery  = publicIdRaw.split('?')[0];
    const ext         = (urlNoQuery.split('.').pop() || '').toLowerCase();
    const validExts   = ['pdf','jpg','jpeg','png','gif','webp','doc','docx','xls','xlsx'];
    const mimeHint    = req.query.mime === 'image' ? 'jpg' : 'pdf';
    const detectedExt = validExts.includes(ext) ? ext : mimeHint;
    const mime        = MIME_MAP[detectedExt] || 'application/pdf';
    const fname       = urlNoQuery.split('/').pop() || `file.${detectedExt}`;

    try {
      // Use cloudinary.api.resource to get a fresh delivery URL with auth
      const resourceInfo = await cloudinary.api.resource(publicIdRaw, {
        resource_type: resourceType,
        type: 'upload',
      });

      // Download using axios or https with the cloudinary credentials
      const https = require('https');
      const http  = require('http');

      // Build authenticated URL using API key/secret as Basic auth
      const authUrl = resourceInfo.secure_url;
      const [cloudName, apiKey, apiSecret] = [
        process.env.CLOUDINARY_URL.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/)?.slice(1) || []
      ][0] || [];

      // Fall back to private_download_url which uses API auth
      const privateUrl = cloudinary.utils.private_download_url(publicIdRaw, detectedExt, {
        resource_type: resourceType,
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        attachment: false,
      });

      const lib = privateUrl.startsWith('https') ? https : http;
      lib.get(privateUrl, (fileRes) => {
        if (fileRes.statusCode >= 400) {
          return next(new ErrorResponse(`Cloudinary delivery failed: ${fileRes.statusCode}`, 502));
        }
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
        Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
        if (fileRes.headers['content-length']) res.setHeader('Content-Length', fileRes.headers['content-length']);
        fileRes.pipe(res);
      }).on('error', (e) => next(new ErrorResponse('Download failed: ' + e.message, 502)));
    } catch (err) {
      return next(new ErrorResponse('Cloudinary error: ' + err.message, 502));
    }
    return;
  }

  // ── Other external URLs ───────────────────────────────────────────────────
  if (p.startsWith('http')) {
    const https = require('https');
    const http  = require('http');
    const lib   = p.startsWith('https') ? https : http;
    lib.get(p, (fileRes) => {
      if (fileRes.statusCode >= 400) return next(new ErrorResponse(`Remote error ${fileRes.statusCode}`, 502));
      res.setHeader('Content-Type', fileRes.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline');
      Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
      fileRes.pipe(res);
    }).on('error', (e) => next(new ErrorResponse('Fetch failed: ' + e.message, 502)));
    return;
  }

  // ── Local disk file ────────────────────────────────────────────────────────
  const safePath = p.replace(/\.\./g, '').replace(/^\//, '');
  const absPath  = path.join(__dirname, '..', safePath);

  if (!fs.existsSync(absPath)) {
    return next(new ErrorResponse('File not found', 404));
  }

  const ext  = path.extname(absPath).slice(1).toLowerCase();
  const mime = MIME_MAP[ext] || 'application/octet-stream';
  const stat = fs.statSync(absPath);

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(absPath)}"`);
  res.setHeader('Content-Length', stat.size);
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k, v));
  fs.createReadStream(absPath).pipe(res);
}));

/**
 * GET /api/files/download?p=uploads/requirements/filename.pdf
 * Streams a file as an attachment so the browser downloads it.
 * Requires JWT — only logged-in users can download files.
 */
router.get('/download', fileAuth, asyncHandler(async (req, res, next) => {
  const { p } = req.query;
  if (!p) return next(new ErrorResponse('File path required', 400));

  // Sanitize — prevent directory traversal
  const safePath = p.replace(/\.\./g, '').replace(/^\//, '');
  const absPath  = path.join(__dirname, '..', safePath);

  if (!fs.existsSync(absPath)) {
    return next(new ErrorResponse('File not found', 404));
  }

  // Use express res.download which sets Content-Disposition: attachment
  res.download(absPath, path.basename(absPath), (err) => {
    if (err) {
      // If headers already sent the pipe will fail — surface a friendly error
      if (!res.headersSent) return next(new ErrorResponse('Failed to download', 500));
      console.error('Download stream error:', err);
    }
  });
}));

module.exports = router;
