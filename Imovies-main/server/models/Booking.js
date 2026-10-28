const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seats: { type: [String], required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'expired'], default: 'pending' },
    expiresAt: { type: Date }, // seat hold deadline while pending
    bookingCode: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 }); // booking history
bookingSchema.index({ status: 1, expiresAt: 1 }); // expiry sweeper
bookingSchema.index({ show: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
