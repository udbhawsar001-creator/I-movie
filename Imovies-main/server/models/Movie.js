const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    genre: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 30, max: 400 }, // minutes
    rating: { type: Number, min: 0, max: 10, default: 7 },
    releaseDate: { type: Date },
    poster: { type: String, default: '' }, // /uploads/<file>
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// movie search + filter + listing order
movieSchema.index({ title: 1 });
movieSchema.index({ isActive: 1, genre: 1, language: 1 });
movieSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Movie', movieSchema);
