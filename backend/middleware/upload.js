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
];

// ── Cloudinary storage (used in production when CLOUDINARY_URL is set) ────────
const useCloudinary = !!process.env.CLOUDINARY_URL;

let storage;
if (useCloudinary) {
  const cloudinary = require('../config/cloudinary');
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: (_req, file) => {
      const isPDF = file.mimetype === 'application/pdf';
      const isDoc = ['application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ].includes(file.mimetype);
      const isImage = file.mimetype.startsWith('image/');
      // Use original file extension in public_id so Cloudinary sets correct Content-Type
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      return {
        folder: 'erp/requirements',
        resource_type: isImage ? 'image' : 'raw',
        // Include extension in public_id for raw files so browser knows content type
        public_id: (isPDF || isDoc) ? `${uniqueName}.${ext}` : uniqueName,
        use_filename: false,
        format: isImage ? undefined : '', // don't auto-format
      };
    },
  });
} else {
  // Fallback: local disk storage
  storage = multer.diskStorage({
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
}

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new ErrorResponse('File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG', 400), false);
  },
});

// Normalise uploaded file so controllers always see the same shape regardless of storage backend:
//   file.path      → URL (Cloudinary) or local relative path
//   file.filename  → public_id (Cloudinary) or disk filename
const normalizeFiles = (req, _res, next) => {
  const normalize = (f) => {
    if (useCloudinary) {
      f.path     = f.path;        // Cloudinary already sets f.path = secure_url
      f.filename = f.filename;    // public_id
      f.originalPath = f.path;    // alias for controllers that use .path
    } else {
      f.path = `uploads/requirements/${f.filename}`;
    }
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
