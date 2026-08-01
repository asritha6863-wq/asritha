const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ErrorResponse = require('../utils/ErrorResponse');

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'requirements');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new ErrorResponse('File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG', 400), false);
  },
});

const handleUpload = (req, res, next) => {
  // supports both array 'files' and named fields like q1File/q2File/q3File
  upload.any()(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new ErrorResponse('File size exceeds 20 MB limit.', 400));
      if (err.code === 'LIMIT_FILE_COUNT') return next(new ErrorResponse('Max 10 files per upload.', 400));
      return next(new ErrorResponse(err.message, 400));
    }
    return next(err);
  });
};

module.exports = handleUpload;
