const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rows: { type: Number, required: true, min: 1, max: 15 },
    seatsPerRow: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false }
);

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    screens: {
      type: [screenSchema],
      validate: { validator: (v) => v.length > 0, message: 'Add at least one screen' },
    },
  },
  { timestamps: true }
);

theatreSchema.index({ city: 1, name: 1 });

module.exports = mongoose.model('Theatre', theatreSchema);
