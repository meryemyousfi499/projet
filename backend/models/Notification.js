const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  lu: { type: Boolean, default: false },
  lien: { type: String },
}, { timestamps: true });

notificationSchema.index({ userId: 1, lu: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
