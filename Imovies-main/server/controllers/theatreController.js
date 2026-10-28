const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { requireFields } = require('../utils/validate');

exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.city ? { city: req.query.city } : {};
  res.json(await Theatre.find(filter).sort({ city: 1, name: 1 }));
});

exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'city', 'screens']);
  res.status(201).json(await Theatre.create(req.body));
});

exports.update = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new ApiError(404, 'Theatre not found');
  const { name, city, address, screens } = req.body;
  if (screens && (await Show.exists({ theatre: theatre._id }))) {
    throw new ApiError(409, 'This theatre has shows. Screens can only be changed when it has none.');
  }
  Object.assign(theatre, { ...(name && { name }), ...(city && { city }), ...(address !== undefined && { address }), ...(screens && { screens }) });
  await theatre.save();
  res.json(theatre);
});

exports.remove = asyncHandler(async (req, res) => {
  if (await Show.exists({ theatre: req.params.id })) throw new ApiError(409, 'Theatre has shows. Delete them first.');
  const t = await Theatre.findByIdAndDelete(req.params.id);
  if (!t) throw new ApiError(404, 'Theatre not found');
  res.json({ message: 'Theatre deleted' });
});
