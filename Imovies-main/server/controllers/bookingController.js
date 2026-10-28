const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const seats = require('../services/seatService');
const { notify } = require('../services/notifyService');
const { paging, pageResult } = require('../utils/validate');

// POST /bookings  { showId, seats[] }  -> pending booking, seats held 5 min
exports.create = asyncHandler(async (req, res) => {
  const booking = await seats.holdSeats({ showId: req.body.showId, user: req.user, seats: req.body.seats });
  res.status(201).json(booking);
});

// GET /bookings/my?type=upcoming|past|all&page&limit
exports.mine = asyncHandler(async (req, res) => {
  const p = paging(req.query, 5, 20);
  const now = new Date();
  const type = req.query.type || 'all';
  const typeMatch =
    type === 'upcoming' ? { 'show.startTime': { $gte: now }, status: { $in: ['confirmed', 'pending'] } }
    : type === 'past' ? { $or: [{ 'show.startTime': { $lt: now } }, { status: { $in: ['cancelled', 'expired'] } }] }
    : {};

  const [out] = await Booking.aggregate([
    { $match: { user: req.user._id } },
    { $lookup: { from: 'shows', localField: 'show', foreignField: '_id', as: 'show' } },
    { $unwind: '$show' },
    { $match: typeMatch },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: p.skip }, { $limit: p.limit },
          { $lookup: { from: 'movies', localField: 'show.movie', foreignField: '_id', as: 'movie' } },
          { $lookup: { from: 'theatres', localField: 'show.theatre', foreignField: '_id', as: 'theatre' } },
          { $unwind: '$movie' }, { $unwind: '$theatre' },
          { $project: { 'movie.title': 1, 'movie.genre': 1, 'theatre.name': 1, 'theatre.city': 1, show: { startTime: 1, screen: 1, price: 1 }, seats: 1, totalAmount: 1, status: 1, expiresAt: 1, bookingCode: 1, createdAt: 1 } },
        ],
        total: [{ $count: 'n' }],
      },
    },
  ]);
  res.json(pageResult(out.data, out.total[0] ? out.total[0].n : 0, p));
});

exports.getOne = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({ path: 'show', populate: [{ path: 'movie', select: 'title genre language duration' }, { path: 'theatre', select: 'name city address' }] });
  if (!booking || (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin')) throw new ApiError(404, 'Booking not found');
  const payment = await Payment.findOne({ booking: booking._id }).sort({ createdAt: -1 });
  res.json({ booking, payment });
});

exports.cancel = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate('show');
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (!['pending', 'confirmed'].includes(booking.status)) throw new ApiError(400, `Booking is already ${booking.status}`);
  if (booking.show.startTime <= new Date()) throw new ApiError(400, 'Cannot cancel after the show has started');

  const wasConfirmed = booking.status === 'confirmed';
  await seats.cancelBooking(booking);

  if (wasConfirmed) {
    const paid = await Payment.findOne({ booking: booking._id, status: 'success' });
    if (paid) await Payment.create({ booking: booking._id, user: req.user._id, amount: paid.amount, method: paid.method, status: 'refunded', transactionId: 'RF' + paid.transactionId });
    await notify(req.user._id, 'cancellation', `Booking ${booking.bookingCode} cancelled. ₹${booking.totalAmount} will be refunded.`);
  }
  res.json(booking);
});
