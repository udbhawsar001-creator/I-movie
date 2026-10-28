const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { requireFields, paging, pageResult, dayRange, makeSeatDocs } = require('../utils/validate');

// { showId: seatsLeft } using one aggregation
async function seatsLeft(showIds) {
  const rows = await Seat.aggregate([
    { $match: { show: { $in: showIds }, $or: [{ status: 'available' }, { status: 'held', heldUntil: { $lt: new Date() } }] } },
    { $group: { _id: '$show', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
}

// GET /shows/movie/:movieId?date&city&theatre
exports.byMovie = asyncHandler(async (req, res) => {
  const { date, city, theatre } = req.query;
  const now = new Date();
  const f = { movie: req.params.movieId, status: 'active', startTime: { $gt: now } };
  if (date) {
    const [start, end] = dayRange(date);
    f.startTime = { $gt: start > now ? start : now, $lte: end };
  }
  if (theatre) f.theatre = theatre;
  else if (city) f.theatre = { $in: await Theatre.find({ city }).distinct('_id') };

  const shows = await Show.find(f).sort({ startTime: 1 }).populate('theatre', 'name city address').lean();
  const left = await seatsLeft(shows.map((s) => s._id));
  res.json(shows.map((s) => ({ ...s, totalSeats: s.rows * s.seatsPerRow, seatsLeft: left[String(s._id)] || 0 })));
});

exports.getOne = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id).populate('movie', 'title genre language duration').populate('theatre', 'name city address');
  if (!show) throw new ApiError(404, 'Show not found');
  res.json(show);
});

// live seat map. "mine" = held by the caller (they can re-pick it)
exports.seats = asyncHandler(async (req, res) => {
  const now = new Date();
  const seats = await Seat.find({ show: req.params.id }).sort({ row: 1, number: 1 }).lean();
  res.json(
    seats.map((s) => {
      const held = s.status === 'held' && s.heldUntil > now;
      return {
        label: s.label,
        status: s.status === 'booked' ? 'booked' : held ? 'held' : 'available',
        mine: held && !!req.user && String(s.heldBy) === String(req.user._id),
      };
    })
  );
});

// ---- admin ----
exports.adminList = asyncHandler(async (req, res) => {
  const p = paging(req.query, 10, 50);
  const [data, total] = await Promise.all([
    Show.find().sort({ startTime: -1 }).skip(p.skip).limit(p.limit).populate('movie', 'title').populate('theatre', 'name city'),
    Show.countDocuments(),
  ]);
  res.json(pageResult(data, total, p));
});

exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['movie', 'theatre', 'screen', 'startTime', 'price']);
  const { movie: movieId, theatre: theatreId, screen: screenName, price } = req.body;
  const startTime = new Date(req.body.startTime);
  if (isNaN(startTime) || startTime <= new Date()) throw new ApiError(400, 'Start time must be a valid future date');
  if (Number(price) < 0) throw new ApiError(400, 'Price cannot be negative');

  const [movie, theatre] = await Promise.all([Movie.findById(movieId), Theatre.findById(theatreId)]);
  if (!movie || !movie.isActive) throw new ApiError(404, 'Movie not found');
  if (!theatre) throw new ApiError(404, 'Theatre not found');
  const screen = theatre.screens.find((s) => s.name === screenName);
  if (!screen) throw new ApiError(400, `Screen "${screenName}" does not exist in ${theatre.name}`);

  // block overlapping shows on the same screen
  const gap = movie.duration * 60000;
  const clash = await Show.exists({
    theatre: theatre._id, screen: screenName, status: 'active',
    startTime: { $gt: new Date(startTime - gap), $lt: new Date(+startTime + gap) },
  });
  if (clash) throw new ApiError(409, 'Another show already runs on this screen at that time');

  const show = await Show.create({ movie: movie._id, theatre: theatre._id, screen: screenName, startTime, price, rows: screen.rows, seatsPerRow: screen.seatsPerRow });
  await Seat.insertMany(makeSeatDocs(show._id, show.rows, show.seatsPerRow));
  res.status(201).json(show);
});

exports.update = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new ApiError(404, 'Show not found');
  if (req.body.price !== undefined) {
    if (Number(req.body.price) < 0) throw new ApiError(400, 'Price cannot be negative');
    show.price = req.body.price; // applies to new bookings only
  }
  if (req.body.startTime) {
    if (await Booking.exists({ show: show._id, status: { $in: ['pending', 'confirmed'] } })) {
      throw new ApiError(409, 'Show has bookings. Time cannot be changed.');
    }
    const t = new Date(req.body.startTime);
    if (isNaN(t) || t <= new Date()) throw new ApiError(400, 'Start time must be a valid future date');
    show.startTime = t;
  }
  await show.save();
  res.json(show);
});

exports.remove = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new ApiError(404, 'Show not found');
  if (await Booking.exists({ show: show._id, status: { $in: ['pending', 'confirmed'] } })) {
    throw new ApiError(409, 'Show has active bookings. Cancel them first.');
  }
  await Seat.deleteMany({ show: show._id });
  await show.deleteOne();
  res.json({ message: 'Show deleted' });
});
