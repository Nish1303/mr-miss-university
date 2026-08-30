const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    dob: { type: Date, required: true },

    university: { type: String, required: true, trim: true, maxlength: 160 },
    faculty: { type: String, required: true, trim: true, maxlength: 160 },
    yearOfStudy: {
      type: String,
      required: true,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'],
    },
    category: {
      type: String,
      required: true,
      enum: ['Mr. University', 'Miss University'],
    },

    previousExperience: { type: String, trim: true, maxlength: 1000, default: '' },
    bio: { type: String, required: true, trim: true, maxlength: 500 },

    // Local disk mode: "/uploads/xyz.jpg". Cloudinary mode: full secure URL.
    photoPath: { type: String, required: true },
    photoOriginalName: { type: String },
    // Only set when Cloudinary is active — needed to delete the asset later.
    photoPublicId: { type: String },

    consent: { type: Boolean, required: true },

    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

registrationSchema.index({ email: 1 });
registrationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Registration', registrationSchema);
