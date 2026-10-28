const mongoose = require('mongoose');

// One document per seat per show. Atomic updates on these docs stop double booking.
const seatSchema = new mongoose.Schema({
  show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
  label: { type: String, required: true }, // A1, B7 ...
  row: { type: Number, required: true },
  number: { type: Number, required: true },
  status: { type: String, enum: ['available', 'held', 'booked'], default: 'available' },
  heldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  heldUntil: { type: Date },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
});

seatSchema.index({ show: 1, label: 1 }, { unique: true });
seatSchema.index({ show: 1, status: 1 }); // seat availability counts
seatSchema.index({ booking: 1 });

module.exports = mongoose.model('Seat', seatSchema);
