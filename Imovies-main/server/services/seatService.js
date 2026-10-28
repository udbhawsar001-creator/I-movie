const mongoose = require('mongoose');
const crypto = require('crypto');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const { emitSeats } = require('../socket');
const { notify } = require('./notifyService');

const HOLD_MS = 5 * 60 * 1000; // seats reserved 5 min while user pays
const MAX_SEATS = 6;

const validLabel = (label, show) => {
  const m = /^([A-Z])(\d{1,2})$/.exec(label);
  if (!m) return false;
  const row = m[1].charCodeAt(0) - 65;
  const num = Number(m[2]);
  return row < show.rows && num >= 1 && num <= show.seatsPerRow;
};

const freeSeats = (bookingId, fromStatus) =>
  Seat.updateMany(
    { booking: bookingId, status: fromStatus },
    { $set: { status: 'available' }, $unset: { heldBy: '', heldUntil: '', booking: '' } }
  );

// Release a pending booking (user cancelled it or hold ran out)
async function releasePending(booking, newStatus) {
  if (booking.status !== 'pending') return;
  booking.status = newStatus;
  await booking.save();
  await freeSeats(booking._id, 'held');
  emitSeats(booking.show);
}

// Step 1: reserve seats. All-or-nothing, atomic per seat document.
exports.holdSeats = async ({ showId, user, seats }) => {
  const labels = [...new Set(Array.isArray(seats) ? seats : [])];
  if (!labels.length) throw new ApiError(400, 'Select at least one seat');
  if (labels.length > MAX_SEATS) throw new ApiError(400, `Max ${MAX_SEATS} seats per booking`);

  const show = await Show.findById(showId);
  if (!show) throw new ApiError(404, 'Show not found');
  if (show.status !== 'active' || show.startTime <= new Date()) throw new ApiError(400, 'This show is no longer open for booking');
  if (!labels.every((l) => validLabel(l, show))) throw new ApiError(400, 'Invalid seat selected');

  // user changing their mind: drop their older unpaid hold on this show first
  const older = await Booking.find({ user: user._id, show: show._id, status: 'pending' });
  for (const b of older) await releasePending(b, 'cancelled');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_MS);
  const bookingId = new mongoose.Types.ObjectId();

  // claim only seats that are free (or whose old hold expired)
  const result = await Seat.updateMany(
    { show: show._id, label: { $in: labels }, $or: [{ status: 'available' }, { status: 'held', heldUntil: { $lt: now } }] },
    { $set: { status: 'held', heldBy: user._id, heldUntil: expiresAt, booking: bookingId } }
  );

  if (result.modifiedCount !== labels.length) {
    await freeSeats(bookingId, 'held'); // give back the ones we did get
    emitSeats(show._id);
    throw new ApiError(409, 'Some seats were just taken. Pick different seats.');
  }

  try {
    const booking = await Booking.create({
      _id: bookingId,
      user: user._id,
      show: show._id,
      seats: labels,
      totalAmount: labels.length * show.price,
      status: 'pending',
      expiresAt,
      bookingCode: 'IM' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    });
    emitSeats(show._id);
    return booking;
  } catch (err) {
    await freeSeats(bookingId, 'held');
    emitSeats(show._id);
    throw err;
  }
};

// Step 2 (after payment ok): turn held seats into booked. False if hold was lost.
exports.confirmBooking = async (booking) => {
  const r = await Seat.updateMany(
    { booking: booking._id, status: 'held', heldBy: booking.user, heldUntil: { $gte: new Date() } },
    { $set: { status: 'booked' }, $unset: { heldUntil: '' } }
  );
  if (r.modifiedCount !== booking.seats.length) {
    await freeSeats(booking._id, 'booked'); // undo partial
    emitSeats(booking.show);
    return false;
  }
  booking.status = 'confirmed';
  booking.expiresAt = undefined;
  await booking.save();
  emitSeats(booking.show);
  return true;
};

// pending -> cancelled (release hold) | confirmed -> cancelled (free seats). Caller handles refund.
exports.cancelBooking = async (booking) => {
  if (booking.status === 'pending') return releasePending(booking, 'cancelled');
  await freeSeats(booking._id, 'booked');
  booking.status = 'cancelled';
  await booking.save();
  emitSeats(booking.show);
};

// runs on an interval: expire unpaid holds
exports.cleanupExpired = async () => {
  const stale = await Booking.find({ status: 'pending', expiresAt: { $lt: new Date() } }).limit(200);
  for (const b of stale) {
    await releasePending(b, 'expired');
    await notify(b.user, 'booking', `Seat hold ${b.bookingCode} expired because payment was not completed.`);
  }
  return stale.length;
};

exports.HOLD_MS = HOLD_MS;
