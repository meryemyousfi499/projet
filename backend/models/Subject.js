const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  titre: { type: String, required: [true, 'Title is required'], trim: true },
  description: { type: String, required: [true, 'Description is required'] },
  technologies: [{ type: String, trim: true }],
  nombreMaxEtudiants: { type: Number, default: 1, min: 1, max: 5 },
  encadrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  statut: { type: String, enum: ['proposé', 'validé', 'refusé', 'complet'], default: 'proposé' },
  nombreCandidatures: { type: Number, default: 0 },
  commentaireAdmin: { type: String },
}, { timestamps: true });

subjectSchema.index({ technologies: 1 });
subjectSchema.index({ statut: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
