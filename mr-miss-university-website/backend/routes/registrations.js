const path = require('path');
const fs = require('fs');
const express = require('express');
const { body, validationResult } = require('express-validator');

const Registration = require('../models/Registration');
const { upload, usingCloudinary } = require('../middleware/upload');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const cloudinary = usingCloudinary ? require('cloudinary').v2 : null; // reads config from CLOUDINARY_URL automatically

// Uploads an in-memory file buffer to Cloudinary and resolves with { secure_url, public_id }.
function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'mr-miss-university/registrations',
        transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

const VALID_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];
const VALID_CATEGORIES = ['Mr. University', 'Miss University'];

/* ------------------------------------------------------------------
   POST /api/registrations  — public: submit a new registration
   ------------------------------------------------------------------ */
router.post(
  '/',
  upload.single('photo'),
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 120 }),
    body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone number is required.').isLength({ min: 7, max: 30 }),
    body('dob')
      .notEmpty().withMessage('Date of birth is required.')
      .isISO8601().withMessage('Date of birth must be a valid date.')
      .custom((value) => new Date(value) <= new Date())
      .withMessage('Date of birth cannot be in the future.'),
    body('university').trim().notEmpty().withMessage('University is required.').isLength({ max: 160 }),
    body('faculty').trim().notEmpty().withMessage('Faculty is required.').isLength({ max: 160 }),
    body('yearOfStudy').trim().isIn(VALID_YEARS).withMessage('Year of study is invalid.'),
    body('category').trim().isIn(VALID_CATEGORIES).withMessage('Category must be Mr. University or Miss University.'),
    body('bio').trim().notEmpty().withMessage('Bio is required.').isLength({ max: 500 }),
    body('previousExperience').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('consent')
      .custom((value) => value === 'true' || value === true || value === 'on')
      .withMessage('Consent is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // In local-disk mode the file is already on disk at this point — remove it.
      // In Cloudinary mode nothing has been uploaded yet (still just an in-memory
      // buffer), so there's nothing to clean up there.
      if (!usingCloudinary && req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'A profile photo is required.' });
    }

    let photoPath;
    let photoPublicId;

    try {
      if (usingCloudinary) {
        const result = await uploadBufferToCloudinary(req.file.buffer);
        photoPath = result.secure_url;
        photoPublicId = result.public_id;
      } else {
        photoPath = `/uploads/${req.file.filename}`;
      }

      const registration = await Registration.create({
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone,
        dob: req.body.dob,
        university: req.body.university,
        faculty: req.body.faculty,
        yearOfStudy: req.body.yearOfStudy,
        category: req.body.category,
        previousExperience: req.body.previousExperience || '',
        bio: req.body.bio,
        photoPath,
        photoOriginalName: req.file.originalname,
        photoPublicId,
        consent: true,
      });

      return res.status(201).json({
        message: 'Registration received successfully.',
        id: registration._id,
      });
    } catch (err) {
      // Something failed after the photo was stored — remove it so it isn't orphaned.
      if (usingCloudinary && photoPublicId) {
        cloudinary.uploader.destroy(photoPublicId).catch(() => {});
      } else if (!usingCloudinary && req.file) {
        fs.unlink(req.file.path, () => {});
      }
      console.error('Failed to save registration:', err);
      return res.status(500).json({ message: 'Something went wrong while saving your registration. Please try again.' });
    }
  }
);

/* ------------------------------------------------------------------
   GET /api/registrations — admin only: list all registrations
   ------------------------------------------------------------------ */
router.get('/', adminAuth, async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.json(registrations);
  } catch (err) {
    console.error('Failed to list registrations:', err);
    res.status(500).json({ message: 'Could not load registrations.' });
  }
});

/* ------------------------------------------------------------------
   GET /api/registrations/export/csv — admin only: CSV export
   NOTE: this route must be declared before "/:id" so Express doesn't
   treat "export" as an :id value.
   ------------------------------------------------------------------ */
router.get('/export/csv', adminAuth, async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 }).lean();

    const columns = [
      'fullName', 'email', 'phone', 'dob', 'university', 'faculty',
      'yearOfStudy', 'category', 'previousExperience', 'bio', 'status', 'createdAt',
    ];
    const escapeCsv = (val) => {
      const str = val === undefined || val === null ? '' : String(val);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = [columns.join(',')];
    registrations.forEach((r) => {
      rows.push(columns.map((col) => escapeCsv(r[col])).join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
    res.send(rows.join('\n'));
  } catch (err) {
    console.error('Failed to export CSV:', err);
    res.status(500).json({ message: 'Could not export registrations.' });
  }
});

/* ------------------------------------------------------------------
   GET /api/registrations/:id — admin only: single registration
   ------------------------------------------------------------------ */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found.' });
    res.json(registration);
  } catch (err) {
    res.status(400).json({ message: 'Invalid registration id.' });
  }
});

/* ------------------------------------------------------------------
   DELETE /api/registrations/:id — admin only
   ------------------------------------------------------------------ */
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found.' });

    if (usingCloudinary && registration.photoPublicId) {
      cloudinary.uploader.destroy(registration.photoPublicId).catch(() => {});
    } else if (!usingCloudinary && registration.photoPath) {
      const filePath = path.join(__dirname, '..', registration.photoPath.replace(/^\/uploads\//, 'uploads/'));
      fs.unlink(filePath, () => {});
    }

    res.json({ message: 'Registration deleted.' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid registration id.' });
  }
});

module.exports = router;
