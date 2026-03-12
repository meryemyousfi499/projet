const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  nomEtape: { type: String, required: true },
  statut: { type: String, enum: ['à faire', 'en cours', 'terminé'], default: 'à faire' },
  commentaire: { type: String },
  ordre: { type: Number, default: 0 },
  dateEcheance: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Milestone', milestoneSchema);
