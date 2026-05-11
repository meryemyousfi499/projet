const Message = require('../models/Message');
const Group   = require('../models/Group');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const { createNotification } = require('../utils/notifications');

const checkAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId).exec();
  if (!project) return null;
  const isStudent    = project.etudiants.some(e => e.toString() === userId.toString());
  const isSupervisor = project.encadrantId.toString() === userId.toString();
  if (isStudent || isSupervisor) return project;
  const group = await Group.findOne({ membres: userId }).exec();
  if (group && project.groupId && group._id.toString() === project.groupId.toString()) {
    return project;
  }
  return null;
};

// ✅ Fonction extraite pour éviter la duplication dans sendMessage et sendFile
const notifyParticipants = async (project, user, notifMessage) => {
  await project.populate('etudiants', '_id');
  const isSupervisor = project.encadrantId.toString() === user.id.toString();
  const targets = isSupervisor
    ? project.etudiants.map(e => e._id)
    : [project.encadrantId];
  for (const targetId of targets) {
    await createNotification(targetId, notifMessage, 'info', `/messages/${project._id}`);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const project = await checkAccess(req.params.projectId, req.user.id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });
    const messages = await Message.find({ projectId: req.params.projectId })
      .populate('senderId', 'nom prenom role avatar')
      .sort({ createdAt: 1 })
      .exec();
    await Message.updateMany(
      { projectId: req.params.projectId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    ).exec();
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const project = await checkAccess(req.params.projectId, req.user.id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    const message = await Message.create({
      projectId: req.params.projectId,
      senderId:  req.user.id,
      content:   content.trim(),
      type:      'text',
      readBy:    [req.user.id],
    });
    const populated = await Message.findById(message._id)
      .populate('senderId', 'nom prenom role avatar')
      .exec();

    // ✅ Utilisation de la fonction extraite
    const senderName = `${req.user.prenom} ${req.user.nom}`;
    await notifyParticipants(project, req.user, `💬 Nouveau message de ${senderName}`);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.sendFile = async (req, res) => {
  try {
    const project = await checkAccess(req.params.projectId, req.user.id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const message = await Message.create({
      projectId: req.params.projectId,
      senderId:  req.user.id,
      content:   req.body.caption || '',
      type:      'file',
      fileName:  req.file.originalname,
      filePath:  `/uploads/${req.file.filename}`,
      fileSize:  req.file.size,
      readBy:    [req.user.id],
    });
    const populated = await Message.findById(message._id)
      .populate('senderId', 'nom prenom role avatar')
      .exec();

    // ✅ Utilisation de la fonction extraite
    const senderName = `${req.user.prenom} ${req.user.nom}`;
    await notifyParticipants(project, req.user, `📎 Fichier reçu de ${senderName}: ${req.file.originalname}`);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getUnreadCounts = async (req, res) => {
  try {
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Candidature introuvable' });
    }
    let query = {};
    if (req.user.role === 'ROLE_STUDENT') {
      const group = await Group.findOne({ membres: req.user.id }).exec();
      if (group) {
        query.$or = [{ etudiants: req.user.id }, { groupId: group._id }];
      } else {
        query.etudiants = req.user.id;
      }
    }
    if (req.user.role === 'ROLE_SUPERVISOR') query.encadrantId = req.user.id;
    const projects = await Project.find(query).select('_id').exec();
    const projectIds = projects.map(p => p._id);
    const counts = await Message.aggregate([
      { $match: { projectId: { $in: projectIds }, readBy: { $ne: req.user._id }, senderId: { $ne: req.user._id } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } }
    ]).exec();
    const result = {};
    let total = 0;
    counts.forEach(c => { result[c._id.toString()] = c.count; total += c.count; });
    res.json({ success: true, data: { byProject: result, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};