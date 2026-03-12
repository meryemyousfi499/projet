const mongoose = require('mongoose');

const deliverableSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type: { type: String, enum: ['rapport', 'code', 'présentation', 'autre'], required: true },
  titre: { type: String, required: true },
  version: { type: String, default: '1.0' },
  fichierURL: { type: String, required: true },
  fichierNom: { type: String },
  taille: { type: Number },
  uploadePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commentaire: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Deliverable', deliverableSchema);
