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

  // ── Cloudinary URL — fetch server-side and stream to client ──────────────
  if (p.startsWith('http')) {
    const https = require('https');
    const http  = require('http');
    // Determine file extension from URL
    const urlNoQuery = p.split('?')[0];
    const ext   = (urlNoQuery.split('.').pop() || '').toLowerCase();
    const validExts = ['pdf','jpg','jpeg','png','gif','webp','doc','docx','xls','xlsx'];
    // Use mime hint from query param if provided (sent by FileViewer component)
    const mimeHint = req.query.mime === 'image' ? 'jpg' : 'pdf';
    const detectedExt = validExts.includes(ext) ? ext : mimeHint;
    const mime  = MIME_MAP[detectedExt] || 'application/pdf';
    const rawFilename = urlNoQuery.split('/').pop() || 'document';
    const fname = rawFilename.includes('.') ? rawFilename : `${rawFilename}.${detectedExt}`;
    const lib   = p.startsWith('https') ? https : http;

    lib.get(p, (fileRes) => {
      if (fileRes.statusCode >= 400) {
        return next(new ErrorResponse(`Remote file error: ${fileRes.statusCode}`, 502));
      }
      // Force correct Content-Type and inline disposition — override Cloudinary headers
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
      Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
      if (fileRes.headers['content-length']) res.setHeader('Content-Length', fileRes.headers['content-length']);
      fileRes.pipe(res);
    }).on('error', (e) => next(new ErrorResponse('Failed to fetch file: ' + e.message, 502)));
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
