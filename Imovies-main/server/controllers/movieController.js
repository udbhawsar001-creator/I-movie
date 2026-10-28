const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Theatre = require('../models/Theatre');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { requireFields, paging, pageResult, dayRange } = require('../utils/validate');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /movies?q&genre&language&city&theatre&date&page&limit
exports.list = asyncHandler(async (req, res) => {
  const { q, genre, language, city, theatre, date } = req.query;
  const p = paging(req.query, 8, 24);
  const filter = { isActive: true };
  if (q) filter.title = { $regex: escapeRe(String(q)), $options: 'i' };
  if (genre) filter.genre = genre;
  if (language) filter.language = language;

  // theatre / city / date filters live on shows: find movies that have a matching upcoming show
  if (city || theatre || date) {
    const now = new Date();
    const sf = { status: 'active', startTime: { $gt: now } };
    if (date) {
      const [start, end] = dayRange(date);
      sf.startTime = { $gt: start > now ? start : now, $lte: end };
    }
    if (theatre) sf.theatre = theatre;
    else if (city) sf.theatre = { $in: await Theatre.find({ city }).distinct('_id') };
    filter._id = { $in: await Show.find(sf).distinct('movie') };
  }

  const [data, total] = await Promise.all([
    Movie.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
    Movie.countDocuments(filter),
  ]);
  res.json(pageResult(data, total, p));
});

// values for the filter dropdowns
exports.filters = asyncHandler(async (_req, res) => {
  const [genres, languages, theatres] = await Promise.all([
    Movie.find({ isActive: true }).distinct('genre'),
    Movie.find({ isActive: true }).distinct('language'),
    Theatre.find().select('name city').sort({ city: 1, name: 1 }),
  ]);
  res.json({ genres: genres.sort(), languages: languages.sort(), theatres, cities: [...new Set(theatres.map((t) => t.city))] });
});

exports.getOne = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie || !movie.isActive) throw new ApiError(404, 'Movie not found');
  res.json(movie);
});

// ---- admin ----
const FIELDS = ['title', 'description', 'genre', 'language', 'duration', 'rating', 'releaseDate', 'isActive'];
const pick = (body) => FIELDS.reduce((o, f) => (body[f] !== undefined && body[f] !== '' ? { ...o, [f]: body[f] } : o), {});

exports.adminList = asyncHandler(async (req, res) => {
  const p = paging(req.query, 10, 50);
  const [data, total] = await Promise.all([Movie.find().sort({ createdAt: -1 }).skip(p.skip).limit(p.limit), Movie.countDocuments()]);
  res.json(pageResult(data, total, p));
});

exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title', 'genre', 'language', 'duration']);
  const data = pick(req.body);
  if (req.file) data.poster = `/uploads/${req.file.filename}`;
  res.status(201).json(await Movie.create(data));
});

exports.update = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new ApiError(404, 'Movie not found');
  Object.assign(movie, pick(req.body));
  if (req.file) movie.poster = `/uploads/${req.file.filename}`;
  await movie.save();
  res.json(movie);
});

// soft delete: old bookings keep pointing at the movie
exports.remove = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new ApiError(404, 'Movie not found');
  if (await Show.exists({ movie: movie._id, startTime: { $gt: new Date() }, status: 'active' })) {
    throw new ApiError(409, 'Movie has upcoming shows. Delete those shows first.');
  }
  movie.isActive = false;
  await movie.save();
  res.json({ message: 'Movie hidden from listings' });
});
