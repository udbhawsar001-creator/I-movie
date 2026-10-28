const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const gateway = require('../services/paymentService');
const seats = require('../services/seatService');
const { notify } = require('../services/notifyService');
const { requireFields } = require('../utils/validate');

// POST /payments { bookingId, method, cardNumber? | upiId? }
exports.pay = asyncHandler(async (req, res) => {
  requireFields(req.body, ['bookingId', 'method']);
  const { bookingId, method } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status === 'confirmed') throw new ApiError(400, 'Already paid');
  if (booking.status !== 'pending' || booking.expiresAt < new Date()) {
    throw new ApiError(410, 'Seat hold expired. Please pick seats again.');
  }

  const result = await gateway.charge({ method, details: req.body });
  if (result.invalid) throw new ApiError(400, result.reason);

  if (!result.ok) {
    await Payment.create({ booking: booking._id, user: req.user._id, amount: booking.totalAmount, method, status: 'failed', transactionId: result.txn, failureReason: result.reason });
    await notify(req.user._id, 'payment', `Payment failed for ${booking.bookingCode}: ${result.reason}. Seats are held until the timer ends.`);
    throw new ApiError(402, result.reason);
  }

  const payment = await Payment.create({ booking: booking._id, user: req.user._id, amount: booking.totalAmount, method, status: 'success', transactionId: result.txn });

  // money taken but hold lost (expired / seats stolen)? refund immediately
  if (!(await seats.confirmBooking(booking))) {
    await Payment.create({ booking: booking._id, user: req.user._id, amount: booking.totalAmount, method, status: 'refunded', transactionId: 'RF' + result.txn });
    booking.status = 'expired';
    await booking.save();
    throw new ApiError(410, 'Seat hold expired during payment. You were not charged.');
  }

  const show = await Show.findById(booking.show).populate('movie', 'title');
  await notify(req.user._id, 'booking', `Booking ${booking.bookingCode} confirmed for ${show.movie.title}. Seats: ${booking.seats.join(', ')}.`);
  res.status(201).json({ booking, payment });
});
