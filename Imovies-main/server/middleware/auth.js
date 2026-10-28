const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getUser = async (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  return User.findById(id);
};

exports.protect = asyncHandler(async (req, _res, next) => {
  let user;
  try {
    user = await getUser(req);
  } catch {
    throw new ApiError(401, 'Session expired, please log in again');
  }
  if (!user) throw new ApiError(401, 'Login required');
  req.user = user;
  next();
});

// attaches req.user if a valid token is sent, never fails
exports.optionalAuth = async (req, _res, next) => {
  try { req.user = await getUser(req); } catch { req.user = null; }
  next();
};

exports.restrictTo = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have permission to do this'));
