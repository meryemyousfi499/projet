const Deliverable = require('../models/Deliverable');
const { createNotification } = require('../utils/notifications');
const Project = require('../models/Project');

exports.getDeliverables = async (req, res) => {
  try {
    const deliverables = await Deliverable.find({ projectId: req.params.projectId })
      .populate('uploadePar', 'nom prenom')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: deliverables });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadDeliverable = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const deliverable = await Deliverable.create({
      projectId: req.params.projectId,
      type: req.body.type,
      titre: req.body.titre,
      version: req.body.version || '1.0',
      fichierURL: `/uploads/${req.file.filename}`,
      fichierNom: req.file.originalname,
      taille: req.file.size,
      uploadePar: req.user.id,
      commentaire: req.body.commentaire
    });
    // Notify supervisor
    const project = await Project.findById(req.params.projectId);
    if (project) {
      await createNotification(project.encadrantId, `New deliverable uploaded: "${deliverable.titre}"`, 'info', `/projects/${project._id}`);
    }
    res.status(201).json({ success: true, data: deliverable });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteDeliverable = async (req, res) => {
  try {
    const deliverable = await Deliverable.findByIdAndDelete(req.params.id);
    if (!deliverable) return res.status(404).json({ success: false, message: 'Deliverable not found' });
    res.json({ success: true, message: 'Deliverable deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
