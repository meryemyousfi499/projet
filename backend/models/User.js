const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: [true, 'Last name is required'], trim: true },
  prenom: { type: String, required: [true, 'First name is required'], trim: true },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  motDePasse: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  role: { type: String, enum: ['ROLE_STUDENT', 'ROLE_SUPERVISOR', 'ROLE_ADMIN'], default: 'ROLE_STUDENT' },
  departement: { type: String, trim: true },
  statut: { type: String, enum: ['actif', 'inactif'], default: 'actif' },
  avatar: { type: String, default: '' },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('motDePasse')) return next();
  const salt = await bcrypt.genSalt(12);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.motDePasse);
};

userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

userSchema.virtual('fullName').get(function() {
  return `${this.prenom} ${this.nom}`;
});

module.exports = mongoose.model('User', userSchema);
