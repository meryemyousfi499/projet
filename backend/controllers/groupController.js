const Group   = require('../models/Group');
const User    = require('../models/User');
const { createNotification } = require('../utils/notifications');

// GET /api/groups/my  — get my group (as member or chef)
exports.getMyGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ membres: req.user.id })
      .populate('chef', 'nom prenom email departement')
      .populate('membres', 'nom prenom email departement')
      .populate('invitations.userId', 'nom prenom email');
    res.json({ success: true, data: group });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/groups/invitations  — pending invitations for me
exports.getMyInvitations = async (req, res) => {
  try {
    const groups = await Group.find({ 'invitations.userId': req.user.id, 'invitations.statut': 'en attente' })
      .populate('chef', 'nom prenom email')
      .populate('membres', 'nom prenom');
    res.json({ success: true, data: groups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/groups  — create a group (student, must not already be in one)
exports.createGroup = async (req, res) => {
  try {
    const existing = await Group.findOne({ membres: req.user.id });
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

// POST /api/groups/invite  — chef invites a student by email
exports.inviteMember = async (req, res) => {
  try {
    const group = await Group.findOne({ chef: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: "Vous n'êtes pas chef d'un groupe." });

    const { email } = req.body;
    const target = await User.findOne({ email, role: 'ROLE_STUDENT' });
    if (!target) return res.status(404).json({ success: false, message: "Étudiant introuvable avec cet email." });
    if (group.hasMember(target._id))
      return res.status(400).json({ success: false, message: "Cet étudiant est déjà membre." });

    const alreadyInGroup = await Group.findOne({ membres: target._id });
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

// POST /api/groups/:id/respond  — accept or refuse an invitation
exports.respondInvitation = async (req, res) => {
  try {
    const { statut } = req.body; // 'accepté' or 'refusé'
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Groupe introuvable." });

    const inv = group.invitations.find(i => i.userId.toString() === req.user.id.toString());
    if (!inv) return res.status(404).json({ success: false, message: "Invitation introuvable." });
    if (inv.statut !== 'en attente') return res.status(400).json({ success: false, message: "Invitation déjà traitée." });

    // If accepting, check not already in a group
    if (statut === 'accepté') {
      const existing = await Group.findOne({ membres: req.user.id });
      if (existing) return res.status(400).json({ success: false, message: "Vous êtes déjà dans un groupe." });
      group.membres.push(req.user.id);
    }

    inv.statut = statut;
    await group.save();

    const chef = await User.findById(group.chef);
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

// DELETE /api/groups/leave  — leave the group (not chef)
exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ membres: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: "Vous n'êtes dans aucun groupe." });
    if (group.chef.toString() === req.user.id.toString())
      return res.status(400).json({ success: false, message: "Le chef ne peut pas quitter le groupe. Supprimez-le." });

    group.membres = group.membres.filter(m => m.toString() !== req.user.id.toString());
    await group.save();

    await createNotification(group.chef, `${req.user.prenom} ${req.user.nom} a quitté le groupe.`, 'info');
    res.json({ success: true, message: "Vous avez quitté le groupe." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/groups  — delete group (chef only)
exports.deleteGroup = async (req, res) => {
  try {
    // Find group where user is the chef
    const group = await Group.findOne({ chef: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: "Groupe introuvable ou vous n'êtes pas le chef." });
    await Group.findByIdAndDelete(group._id);
    res.json({ success: true, message: "Groupe supprimé." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/groups/members/:userId  — chef removes a member
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findOne({ chef: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: "Groupe introuvable." });
    group.membres = group.membres.filter(m => m.toString() !== req.params.userId);
    await group.save();
    await createNotification(req.params.userId, `Vous avez été retiré du groupe "${group.nom}".`, 'info');
    res.json({ success: true, message: "Membre retiré." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/groups  — (supervisor/admin) get all groups
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('chef', 'nom prenom email')
      .populate('membres', 'nom prenom email departement')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: groups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};