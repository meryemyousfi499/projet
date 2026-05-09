const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ─── Helper : envoyer le token JWT ────────────────────────────────────────
const sendToken = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      departement: user.departement,
      avatar: user.avatar
    }
  });
};

// ─── Helper : transporter Nodemailer (créé une seule fois) ────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    port: 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,   // mot de passe d'application Gmail, pas le mdp du compte
    },
    tls: { rejectUnauthorized: true },
  });

// ─────────────────────────────────────────────────────────────────────────
// REGISTER
// FIX : le champ role venant de req.body est maintenant IGNORÉ
//       → toujours ROLE_STUDENT à l'inscription (correction vulnérabilité critique)
// ─────────────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, departement } = req.body;

    // Validation de type basique (double sécurité côté contrôleur)
    if (typeof email !== 'string' || typeof motDePasse !== 'string') {
      return res.status(400).json({ success: false, message: 'Illegal arguments: object, string' });
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // role JAMAIS pris depuis req.body
    const user = await User.create({
      nom,
      prenom,
      email,
      motDePasse,
      departement,
      role: 'ROLE_STUDENT',
    });

    sendToken(user, 201, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// LOGIN
// FIX : validation de type sur email et motDePasse (anti-injection NoSQL)
// ─────────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Rejet explicite si l'un des champs n'est pas une string (injection $gt, $ne, $regex…)
    if (!email || !motDePasse) {
      return res.status(400).json({ success: false, message: 'Veuillez fournir un email et un mot de passe' });
    }
    if (typeof email !== 'string' || typeof motDePasse !== 'string') {
      return res.status(400).json({ success: false, message: 'Illegal arguments: object, string' });
    }

    const user = await User.findOne({ email }).select('+motDePasse').exec();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }
    if (user.statut === 'inactif') {
      return res.status(403).json({ success: false, message: 'Compte désactivé. Contactez un administrateur.' });
    }

    const isMatch = await user.matchPassword(motDePasse);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).exec();
  res.json({ success: true, data: user });
};

// ─────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, departement } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { nom, prenom, departement },
      { new: true, runValidators: true }
    ).exec();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+motDePasse').exec();
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }
    user.motDePasse = newPassword;
    await user.save();
    sendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
//
// FIX 1 : validation de type sur email (anti-injection NoSQL)
// FIX 2 : réponse 200 même si email inexistant (anti-énumération d'utilisateurs)
// FIX 3 : nettoyage du token en base si sendMail échoue
// FIX 4 : message d'erreur serveur précis dans les logs, générique vers le client
// FIX 5 : vérification que EMAIL_USER et EMAIL_PASS sont définis avant d'envoyer
// ─────────────────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // FIX 1 — rejet si email n'est pas une string (injection NoSQL $gt, $regex…)
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email invalide' });
    }

    // FIX 5 — vérifier la config email au plus tôt
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('[forgotPassword] EMAIL_USER ou EMAIL_PASS manquant dans .env');
      return res.status(500).json({
        success: false,
        message: 'Configuration email manquante. Contactez un administrateur.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).exec();

    // FIX 2 — toujours répondre 200 (ne pas révéler si l'email existe)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.',
      });
    }

    // Générer le token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // FIX 3 — si sendMail échoue, nettoyer le token en base avant de répondre
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"PFE Management" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;
                      border:1px solid #e4e6f1;border-radius:12px;">
            <h2 style="color:#1a1d3b;">Réinitialisation du mot de passe</h2>
            <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe.
               Cliquez sur le bouton ci-dessous :</p>
            <a href="${resetURL}"
               style="display:inline-block;margin:20px 0;padding:12px 28px;
                      background:#5b5fcf;color:white;text-decoration:none;
                      border-radius:8px;font-weight:bold;">
              Réinitialiser mon mot de passe
            </a>
            <p style="color:#6b7280;font-size:13px;">
              Ce lien expire dans <strong>10 minutes</strong>.
            </p>
            <p style="color:#6b7280;font-size:13px;">
              Si vous n'avez pas demandé cela, ignorez cet email.
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      // FIX 3 — nettoyer le token si l'envoi a échoué
      console.error('[forgotPassword] Erreur sendMail :', mailErr.message);
      user.resetPasswordToken  = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        // FIX 4 — message générique vers le client, détail dans les logs
        message: "Erreur lors de l'envoi de l'email. Vérifiez votre configuration Gmail.",
      });
    }

    res.status(200).json({ success: true, message: 'Instructions envoyées par email.' });
  } catch (err) {
    console.error('[forgotPassword] Erreur inattendue :', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).exec();

    if (!user) {
      return res.status(400).json({ success: false, message: 'Lien invalide ou expiré' });
    }

    user.motDePasse          = req.body.motDePasse;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};