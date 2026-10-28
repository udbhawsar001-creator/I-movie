const ApiError = require('./ApiError');

exports.isEmail = (s) => /^\S+@\S+\.\S+$/.test(s || '');

exports.requireFields = (obj, fields) => {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length) throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
};

exports.paging = (q, def = 8, max = 50) => {
  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(q.limit) || def));
  return { page, limit, skip: (page - 1) * limit };
};

exports.pageResult = (data, total, { page, limit }) => ({ data, total, page, pages: Math.max(1, Math.ceil(total / limit)) });

// "2026-10-25" -> [start, end] of that local day, or throws 400
exports.dayRange = (str) => {
  const start = new Date(`${str}T00:00:00`);
  const end = new Date(`${str}T23:59:59.999`);
  if (isNaN(start)) throw new ApiError(400, 'Invalid date, use YYYY-MM-DD');
  return [start, end];
};

exports.makeSeatDocs = (showId, rows, seatsPerRow) => {
  const docs = [];
  for (let r = 0; r < rows; r++) {
    for (let n = 1; n <= seatsPerRow; n++) {
      docs.push({ show: showId, label: `${String.fromCharCode(65 + r)}${n}`, row: r, number: n });
    }
  }
  return docs;
};
