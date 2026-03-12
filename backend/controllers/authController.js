const User = require('../models/User');
const crypto = require('crypto');

const sendToken = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      id: user._id,   // keep both for backward compat
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      departement: user.departement,
      avatar: user.avatar
    }
  });
};

exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, departement } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = await User.create({ nom, prenom, email, motDePasse, departement, role: 'ROLE_STUDENT' });
    sendToken(user, 201, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse) return res.status(400).json({ success: false, message: 'Please provide email and password' });
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.statut === 'inactif') return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    const isMatch = await user.matchPassword(motDePasse);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, data: user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, departement } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { nom, prenom, departement }, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+motDePasse');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.motDePasse = newPassword;
    await user.save();
    sendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'Aucun compte avec cet email.' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email via nodemailer
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"PFE Management" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🔐 Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e4e6f1;border-radius:12px;">
          <h2 style="color:#1a1d3b;">Réinitialisation du mot de passe</h2>
          <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <a href="${resetURL}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#5b5fcf;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color:#6b7280;font-size:13px;">Ce lien expire dans <strong>10 minutes</strong>.</p>
          <p style="color:#6b7280;font-size:13px;">Si vous n'avez pas demandé cela, ignorez cet email.</p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Instructions envoyées par email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur envoi email: ' + err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    user.motDePasse = req.body.motDePasse;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    sendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};