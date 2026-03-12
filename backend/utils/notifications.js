const Notification = require('../models/Notification');

exports.createNotification = async (userId, message, type = 'info', lien = '') => {
  try {
    await Notification.create({ userId, message, type, lien });
  } catch (err) {
    console.error('Notification error:', err);
  }
};
