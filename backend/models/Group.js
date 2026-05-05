const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  statut:  { type: String, enum: ['en attente', 'accepté', 'refusé'], default: 'en attente' },
  invitedAt: { type: Date, default: Date.now },
});

const groupSchema = new mongoose.Schema({
  nom:       { type: String, required: [true, 'Group name required'], trim: true },
  chef:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // leader
  membres:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],                 // accepted members (includes chef)
  invitations: [invitationSchema],
}, { timestamps: true });

// Virtual: all member ids (membres only, chef is already inside membres)
groupSchema.methods.hasMember = function(userId) {
  return this.membres.some(m => m.toString() === userId.toString());
};

module.exports = mongoose.model('Group', groupSchema);
