const Subject = require('../models/Subject');
const { createNotification } = require('../utils/notifications');
const User = require('../models/User');

exports.getAllSubjects = async (req, res) => {
  try {
    const { statut, technology, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (statut) query.statut = statut;
    if (technology) query.technologies = { $regex: technology, $options: 'i' };
    if (search) query.$or = [
      { titre: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    const total = await Subject.countDocuments(query);
    const subjects = await Subject.find(query)
      .populate('encadrantId', 'nom prenom email departement')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    res.json({ success: true, data: subjects, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('encadrantId', 'nom prenom email departement');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, data: subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const subject = await Subject.create({ ...req.body, encadrantId: req.user.id });
    // Notify admins
    const admins = await User.find({ role: 'ROLE_ADMIN' });
    for (const admin of admins) {
      await createNotification(admin._id, `New subject proposed: "${subject.titre}"`, 'info', `/subjects/${subject._id}`);
    }
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    let subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    if (req.user.role !== 'ROLE_ADMIN' && subject.encadrantId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: subject });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.validateSubject = async (req, res) => {
  try {
    const { statut, commentaireAdmin } = req.body;
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { statut, commentaireAdmin },
      { new: true }
    ).populate('encadrantId', 'nom prenom');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    const msg = statut === 'validé' 
      ? `Your subject "${subject.titre}" has been approved!`
      : `Your subject "${subject.titre}" has been rejected. ${commentaireAdmin || ''}`;
    await createNotification(subject.encadrantId._id, msg, statut === 'validé' ? 'success' : 'error');
    res.json({ success: true, data: subject });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMySupervisorSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ encadrantId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
