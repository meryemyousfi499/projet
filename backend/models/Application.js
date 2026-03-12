const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  groupId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sujetId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  statut:   { type: String, enum: ['en attente', 'accepté', 'refusé'], default: 'en attente' },
  motivation: { type: String },
  commentaireEncadrant: { type: String },
}, { timestamps: true });

applicationSchema.index({ groupId: 1, sujetId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
