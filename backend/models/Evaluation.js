const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  noteEncadrant: { type: Number, min: 0, max: 20 },
  noteJury: { type: Number, min: 0, max: 20 },
  noteFinale: { type: Number, min: 0, max: 20 },
  commentaireEncadrant: { type: String },
  commentaireJury: { type: String },
  evaluateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

evaluationSchema.pre('save', function(next) {
  if (this.noteEncadrant != null && this.noteJury != null) {
    this.noteFinale = parseFloat(((this.noteEncadrant * 0.4) + (this.noteJury * 0.6)).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Evaluation', evaluationSchema);
