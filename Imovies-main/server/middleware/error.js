const logger = require('../utils/logger');

exports.notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// central error handler: one place decides status + message
exports.errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(', '); }
  else if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.code === 11000) { status = 409; message = `Already exists: ${Object.keys(err.keyValue || {}).join(', ')}`; }
  else if (err.name === 'MulterError') { status = 400; message = err.message; }

  if (status >= 500) {
    logger.error(err.stack || err.message, { path: req.originalUrl, method: req.method });
    if (process.env.NODE_ENV === 'production') message = 'Server error';
  }
  res.status(status).json({ message });
};
