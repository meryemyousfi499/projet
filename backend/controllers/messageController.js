const Message = require('../models/Message');
const Group   = require('../models/Group');
const Project = require('../models/Project');
const { createNotification } = require('../utils/notifications');

// Check if user has access to this project (via group membership or supervisor)
const checkAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isStudent    = project.etudiants.some(e => e.toString() === userId.toString());
  const isSupervisor = project.encadrantId.toString() === userId.toString();
  if (isStudent || isSupervisor) return project;

  // Also check via group membership (for members not explicitly in etudiants array)
  const Group = require('../models/Group');
  const group = await Group.findOne({ membres: userId });
  if (group && project.groupId && group._id.toString() === project.groupId.toString()) {
    return project;
  }
  return null;
};

// GET /api/messages/:projectId
exports.getMessages = async (req, res) => {
  try {
    const project = await checkAccess(req.params.projectId, req.user.id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    const messages = await Message.find({ projectId: req.params.projectId })
      .populate('senderId', 'nom prenom role avatar')
      .sort({ createdAt: 1 });

    // Mark unread as read
    await Message.updateMany(
      { projectId: req.params.projectId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/messages/:projectId  (text)
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

    const populated = await Message.findById(message._id).populate('senderId', 'nom prenom role avatar');

    // Notify the other party
    await project.populate('etudiants', '_id');
    const isSupervisor = project.encadrantId.toString() === req.user.id.toString();
    const targets = isSupervisor
      ? project.etudiants.map(e => e._id)
      : [project.encadrantId];

    const senderName = `${req.user.prenom} ${req.user.nom}`;
    for (const targetId of targets) {
      await createNotification(targetId, `💬 Nouveau message de ${senderName}`, 'info', `/messages/${project._id}`);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/messages/:projectId/upload  (file)
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

    const populated = await Message.findById(message._id).populate('senderId', 'nom prenom role avatar');

    await project.populate('etudiants', '_id');
    const isSupervisor = project.encadrantId.toString() === req.user.id.toString();
    const targets = isSupervisor
      ? project.etudiants.map(e => e._id)
      : [project.encadrantId];

    const senderName = `${req.user.prenom} ${req.user.nom}`;
    for (const targetId of targets) {
      await createNotification(targetId, `📎 Fichier reçu de ${senderName}: ${req.file.originalname}`, 'info', `/messages/${project._id}`);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/messages/unread-counts
exports.getUnreadCounts = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'ROLE_STUDENT') {
      const Group = require('../models/Group');
      const group = await Group.findOne({ membres: req.user.id });
      if (group) {
        query.$or = [{ etudiants: req.user.id }, { groupId: group._id }];
      } else {
        query.etudiants = req.user.id;
      }
    }
    if (req.user.role === 'ROLE_SUPERVISOR') query.encadrantId = req.user.id;
    const projects = await Project.find(query).select('_id');
    const projectIds = projects.map(p => p._id);

    const counts = await Message.aggregate([
      { $match: { projectId: { $in: projectIds }, readBy: { $ne: req.user._id }, senderId: { $ne: req.user._id } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } }
    ]);

    const result = {};
    let total = 0;
    counts.forEach(c => { result[c._id.toString()] = c.count; total += c.count; });
    res.json({ success: true, data: { byProject: result, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};