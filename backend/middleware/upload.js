const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const ErrorResponse = require('../utils/ErrorResponse');

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
];

// Always use local disk storage
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

// Normalize file so controllers always see file.path as relative path
const normalizeFiles = (req, _res, next) => {
  const normalize = (f) => {
    f.path = `uploads/requirements/${f.filename}`;
    return f;
  };
  if (req.files) req.files = req.files.map(normalize);
  if (req.file)  req.file  = normalize(req.file);
  next();
};

const handleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (!err) return normalizeFiles(req, res, next);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE')  return next(new ErrorResponse('File size exceeds 20 MB limit.', 400));
      if (err.code === 'LIMIT_FILE_COUNT') return next(new ErrorResponse('Max 10 files per upload.', 400));
      return next(new ErrorResponse(err.message, 400));
    }
    return next(err);
  });
};

module.exports = handleUpload;
