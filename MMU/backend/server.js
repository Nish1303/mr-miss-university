require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');

const registrationRoutes = require('./routes/registrations');

const app = express();
const PORT = process.env.PORT || 5000;

/* ------------------------------------------------------------------
   Middleware
   ------------------------------------------------------------------ */
const allowedOrigin = process.env.CLIENT_URL || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded profile photos, served statically so the admin panel can view them.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin dashboard (plain static HTML/JS — see public/admin.html).
app.use('/admin', express.static(path.join(__dirname, 'public')));

/* ------------------------------------------------------------------
   Routes
   ------------------------------------------------------------------ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1 });
});

app.use('/api/registrations', registrationRoutes);

/* ------------------------------------------------------------------
   404 + error handling
   ------------------------------------------------------------------ */
app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// Keep this AFTER all routes — Express recognizes it as an error handler
// by its four-argument signature.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Photo is too large. Max size is 5MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err && err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ message: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

/* ------------------------------------------------------------------
   Start
   ------------------------------------------------------------------ */
async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Mr. & Miss University API running on http://localhost:${PORT}`);
    console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
  });
}

start();
