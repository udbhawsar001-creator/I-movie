const User = require('../models/User');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

exports.stats = asyncHandler(async (_req, res) => {
  const [users, movies, theatres, upcomingShows, confirmedBookings, money, top, recent] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Movie.countDocuments({ isActive: true }),
    Theatre.countDocuments(),
    Show.countDocuments({ startTime: { $gt: new Date() }, status: 'active' }),
    Booking.countDocuments({ status: 'confirmed' }),
    Payment.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' } } }]),
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $lookup: { from: 'shows', localField: 'show', foreignField: '_id', as: 'show' } },
      { $unwind: '$show' },
      { $group: { _id: '$show.movie', tickets: { $sum: { $size: '$seats' } }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { tickets: -1 } }, { $limit: 5 },
      { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'movie' } },
      { $unwind: '$movie' },
      { $project: { title: '$movie.title', tickets: 1, revenue: 1 } },
    ]),
    Booking.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email')
      .populate({ path: 'show', select: 'startTime movie', populate: { path: 'movie', select: 'title' } }),
  ]);
  const sum = (s) => (money.find((m) => m._id === s) || { total: 0 }).total;
  res.json({ users, movies, theatres, upcomingShows, confirmedBookings, revenue: sum('success') - sum('refunded'), top, recent });
});
