const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { message } });

exports.apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests. Try again in a few minutes.');
exports.authLimiter = make(15 * 60 * 1000, 30, 'Too many login attempts. Try again in 15 minutes.');
exports.bookingLimiter = make(60 * 1000, 20, 'Too many booking attempts. Wait a minute and retry.');
