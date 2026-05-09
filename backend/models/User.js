const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est obligatoire'],
      trim: true,
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom est obligatoire'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
        'Email invalide',
      ],
    },
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      // FIX — role jamais modifiable directement depuis req.body
      // (le contrôleur register impose toujours ROLE_STUDENT)
      enum: ['ROLE_STUDENT', 'ROLE_SUPERVISOR', 'ROLE_ADMIN'],
      default: 'ROLE_STUDENT',
    },
    departement: { type: String, trim: true },
    statut: {
      type: String,
      enum: ['actif', 'inactif'],
      default: 'actif',
    },
    avatar: { type: String, default: '' },

    // Champs reset password
    resetPasswordToken:  { type: String, index: { sparse: true } },
    // FIX — nom cohérent : resetPasswordExpire (identique dans le contrôleur)
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
);

// ─── Hash du mot de passe avant sauvegarde ────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  const salt = await bcrypt.genSalt(12);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
  next();
});

// ─── Comparaison mot de passe ─────────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.motDePasse);
};

// ─── Génération du JWT ────────────────────────────────────────────────────
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ─── Virtuel fullName ─────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.prenom} ${this.nom}`;
});

module.exports = mongoose.model('User', userSchema);