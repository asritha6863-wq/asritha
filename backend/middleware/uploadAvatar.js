const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const ErrorResponse = require('../utils/ErrorResponse');

const AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const useCloudinary = !!process.env.CLOUDINARY_URL;

let storage;
if (useCloudinary) {
  const cloudinary = require('../config/cloudinary');
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: (_req, file) => ({
      folder: 'erp/avatars',
      resource_type: 'image',
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      use_filename: false,
    }),
  });
} else {
  storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', 'avatars');
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new ErrorResponse('Only JPG, PNG, or WebP images are allowed for avatars.', 400), false);
  },
});

const handleAvatarUpload = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (!err) {
      // Normalize: always expose file.path as the URL/path to store
      if (req.file && useCloudinary) {
        // Cloudinary sets req.file.path = secure_url already
        req.file.localPath = null; // no local path to delete
      } else if (req.file) {
        req.file.path = `uploads/avatars/${req.file.filename}`;
      }
      return next();
    }
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ErrorResponse('Avatar must be under 5 MB.', 400));
    return next(err);
  });
};

module.exports = handleAvatarUpload;
