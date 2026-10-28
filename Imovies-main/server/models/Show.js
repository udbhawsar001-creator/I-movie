const mongoose = require('mongoose');

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    screen: { type: String, required: true },
    startTime: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    rows: { type: Number, required: true },
    seatsPerRow: { type: Number, required: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  },
  { timestamps: true }
);

// show filtering: by movie+date, by theatre+date
showSchema.index({ movie: 1, startTime: 1 });
showSchema.index({ theatre: 1, screen: 1, startTime: 1 });

module.exports = mongoose.model('Show', showSchema);
