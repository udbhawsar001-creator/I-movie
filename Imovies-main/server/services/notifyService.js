const Notification = require('../models/Notification');
const { emitUser } = require('../socket');

exports.notify = async (userId, type, message) => {
  const n = await Notification.create({ user: userId, type, message });
  emitUser(userId, 'notify', n); // live toast if the user is online
  return n;
};
