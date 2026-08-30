const fs = require('fs');
const path = require('path');
const multer = require('multer');

const maxBytes = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024;

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed for the profile photo.'));
  }
  cb(null, true);
}

// Cloudinary is used automatically when CLOUDINARY_URL is set in .env — this is
// the recommended path for production, since hosts like Render don't guarantee
// local files survive a redeploy. Without it, photos are saved to ./uploads on
// disk instead, which is fine for local development and testing.
//
// When Cloudinary is active, multer holds the file in memory (as req.file.buffer)
// instead of writing it to disk — the actual upload to Cloudinary happens in
// routes/registrations.js, AFTER form validation passes, so an invalid
// submission never wastes a Cloudinary upload.
const usingCloudinary = Boolean(process.env.CLOUDINARY_URL);

let storage;

if (usingCloudinary) {
  storage = multer.memoryStorage();
  console.log('Photo uploads: using Cloudinary.');
} else {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      cb(null, unique);
    },
  });

  console.log('Photo uploads: using local disk storage (./uploads). Set CLOUDINARY_URL in .env for production.');
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxBytes },
});

module.exports = { upload, usingCloudinary };
