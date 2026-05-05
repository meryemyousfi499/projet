const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  sujetId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  groupId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  etudiants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  encadrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  statut: { type: String, enum: ['en cours', 'terminé', 'suspendu'], default: 'en cours' },
  progression: { type: Number, default: 0, min: 0, max: 100 },
  dateFin: { type: Date },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
