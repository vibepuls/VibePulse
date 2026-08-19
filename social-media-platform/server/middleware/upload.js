
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.uploadType || 'general';
    const dest = path.join(uploadDir, type);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImages = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const allowedVideos = ['.mp4', '.webm', '.mov'];
  const allowedFiles = [...allowedImages, ...allowedVideos, '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path.basename(file.originalname);
  const mimetype = file.mimetype;

  if (baseName.includes('\0') || /\.(php|phtml|exe|sh|bat|cmd|js)$/i.test(baseName)) {
    return cb(new Error('Unsafe file name.'), false);
  }
  if (allowedFiles.includes(ext) && (
    mimetype.startsWith('image/') || mimetype.startsWith('video/') ||
    mimetype === 'application/pdf' || mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )) cb(null, true);
  else cb(new Error('Invalid file type. Allowed: images, videos, PDF, DOC.'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
    files: 10, fields: 30
  }
});

const setUploadType = (type) => (req, res, next) => { req.uploadType = type; next(); };

module.exports = { upload, setUploadType };
