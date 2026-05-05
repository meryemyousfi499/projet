const Group   = require('../models/Group');
const User    = require('../models/User');
const { createNotification } = require('../utils/notifications');

exports.getMyGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ membres: req.user.id })
      .populate('chef', 'nom prenom email departement')
      .populate('membres', 'nom prenom email departement')
      .populate('invitations.userId', 'nom prenom email')
      .exec(); // L11 ✅
    res.json({ success: true, data: group });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMyInvitations = async (req, res) => {
  try {
    const groups = await Group.find({ 'invitations.userId': req.user.id, 'invitations.statut': 'en attente' })
      .populate('chef', 'nom prenom email')
      .populate('membres', 'nom prenom')
      .exec(); // L21 ✅
    res.json({ success: true, data: groups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createGroup = async (req, res) => {
  try {
    const existing = await Group.findOne({ membres: req.user.id }).exec(); // L29 ✅
    if (existing) return res.status(400).json({ success: false, message: "Vous êtes déjà dans un groupe." });

    const group = await Group.create({
      nom:     req.body.nom,
      chef:    req.user.id,
      membres: [req.user.id],
    });
    await group.populate('chef', 'nom prenom email');
    await group.populate('membres', 'nom prenom email');
    res.status(201).json({ success: true, data: group });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.inviteMember = async (req, res) => {
  try {
    const group = await Group.findOne({ chef: req.user.id }).exec(); // L46 ✅
    if (!group) return res.status(404).json({ success: false, message: "Vous n'êtes pas chef d'un groupe." });

    const { email } = req.body;
    const target = await User.findOne({ email, role: 'ROLE_STUDENT' }).exec(); // L50 ✅
    if (!target) return res.status(404).json({ success: false, message: "Étudiant introuvable avec cet email." });
    if (group.hasMember(target._id))
      return res.status(400).json({ success: false, message: "Cet étudiant est déjà membre." });

    const alreadyInGroup = await Group.findOne({ membres: target._id }).exec(); // L55 ✅
    if (alreadyInGroup)
      return res.status(400).json({ success: false, message: "Cet étudiant est déjà dans un autre groupe." });

    const alreadyInvited = group.invitations.find(
      i => i.userId.toString() === target._id.toString() && i.statut === 'en attente'
    );
    if (alreadyInvited)
      return res.status(400).json({ success: false, message: "Invitation déjà envoyée." });

    group.invitations.push({ userId: target._id });
    await group.save();

    await createNotification(
      target._id,
      `👥 ${req.user.prenom} ${req.user.nom} vous invite à rejoindre le groupe "${group.nom}"`,
      'info'
    );

    await group.populate('membres', 'nom prenom email');
    await group.populate('invitations.userId', 'nom prenom email');
    res.json({ success: true, data: group });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.respondInvitation = async (req, res) => {
  try {
    const { statut } = req.body;
    const group = await Group.findById(req.params.id).exec(); // L84 ✅
    if (!group) return res.status(404).json({ success: false, message: "Groupe introuvable." });

    const inv = group.invitations.find(i => i.userId.toString() === req.user.id.toString());
    if (!inv) return res.status(404).json({ success: false, message: "Invitation introuvable." });
    if (inv.statut !== 'en attente') return res.status(400).json({ success: false, message: "Invitation déjà traitée." });

    if (statut === 'accepté') {
      const existing = await Group.findOne({ membres: req.user.id }).exec(); // L93 ✅
      if (existing) return res.status(400).json({ success: false, message: "Vous êtes déjà dans un groupe." });
      group.membres.push(req.user.id);
    }

    inv.statut = statut;
    await group.save();

    // L101 — variable 'chef' inutilisée → supprimée ✅
    await createNotification(
      group.chef,
      statut === 'accepté'
        ? `✅ ${req.user.prenom} ${req.user.nom} a rejoint votre groupe "${group.nom}"!`
        : `❌ ${req.user.prenom} ${req.user.nom} a refusé votre invitation.`,
      statut === 'accepté' ? 'success' : 'info'
    );

    await group.populate('chef', 'nom prenom email');
    await group.populate('membres', 'nom prenom email departement');
    await group.populate('invitations.userId', 'nom prenom email');
    res.json({ success: true, data: group });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ membres: req.user.id }).exec(); // L120 ✅
    if (!group) return res.status(404).json({ success: false, message: "Vous n'êtes dans aucun groupe." });
    if (group.chef.toString() === req.user.id.toString())
      return res.status(400).json({ success: false, message: "Le chef ne peut pas quitter le groupe. Supprimez-le." });

    group.membres = group.membres.filter(m => m.toString() !== req.user.id.toString());
    await group.save();

    await createNotification(group.chef, `${req.user.prenom} ${req.user.nom} a quitté le groupe.`, 'info');
    res.json({ success: true, message: "Vous avez quitté le groupe." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ chef: req.user.id }).exec(); // L137 ✅
    if (!group) return res.status(404).json({ success: false, message: "Groupe introuvable ou vous n'êtes pas le chef." });
    await Group.findByIdAndDelete(group._id).exec(); // L139 ✅
    res.json({ success: true, message: "Groupe supprimé." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findOne({ chef: req.user.id }).exec(); // L147 ✅
    if (!group) return res.status(404).json({ success: false, message: "Groupe introuvable." });
    group.membres = group.membres.filter(m => m.toString() !== req.params.userId);
    await group.save();
    await createNotification(req.params.userId, `Vous avez été retiré du groupe "${group.nom}".`, 'info');
    res.json({ success: true, message: "Membre retiré." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('chef', 'nom prenom email')
      .populate('membres', 'nom prenom email departement')
      .sort({ createdAt: -1 })
      .exec(); // L162 ✅
    res.json({ success: true, data: groups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};