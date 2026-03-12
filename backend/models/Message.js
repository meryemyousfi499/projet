const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  senderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  content:   { type: String, default: '' },
  type:      { type: String, enum: ['text', 'file'], default: 'text' },
  fileName:  { type: String },
  filePath:  { type: String },
  fileSize:  { type: Number },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

messageSchema.index({ projectId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
