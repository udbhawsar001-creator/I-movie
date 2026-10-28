const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isEmail, requireFields } = require('../utils/validate');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  requireFields(req.body, ['name', 'email', 'password']);
  if (!isEmail(email)) throw new ApiError(400, 'Enter a valid email');
  if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  if (await User.findOne({ email: String(email).toLowerCase() })) throw new ApiError(409, 'Email already registered');

  const user = await User.create({ name, email, password }); // role always "user" here
  res.status(201).json({ token: sign(user._id), user: pub(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  requireFields(req.body, ['email', 'password']);
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(String(password)))) throw new ApiError(401, 'Wrong email or password');
  res.json({ token: sign(user._id), user: pub(user) });
});

exports.me = (req, res) => res.json({ user: pub(req.user) });
