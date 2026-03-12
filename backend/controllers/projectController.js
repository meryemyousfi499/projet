const Project = require('../models/Project');
const Milestone = require('../models/Milestone');

exports.getProjects = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'ROLE_STUDENT') {
      // Find projects where user is directly listed OR via their group
      const Group = require('../models/Group');
      const group = await Group.findOne({ membres: req.user.id });
      const groupId = group?._id;
      
      if (groupId) {
        // Find by direct etudiants OR by groupId
        query.$or = [
          { etudiants: req.user.id },
          { groupId: groupId }
        ];
      } else {
        query.etudiants = req.user.id;
      }
    }
    if (req.user.role === 'ROLE_SUPERVISOR') query.encadrantId = req.user.id;
    if (req.query.statut) query.statut = req.query.statut;
    const projects = await Project.find(query)
      .populate('sujetId', 'titre technologies description')
      .populate('etudiants', 'nom prenom email departement')
      .populate('encadrantId', 'nom prenom email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('sujetId', 'titre technologies description')
      .populate('etudiants', 'nom prenom email departement avatar')
      .populate('encadrantId', 'nom prenom email departement avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateProgression = async (req, res) => {
  try {
    const milestones = await Milestone.find({ projectId: req.params.id });
    const total = milestones.length;
    const done = milestones.filter(m => m.statut === 'terminé').length;
    const progression = total > 0 ? Math.round((done / total) * 100) : 0;
    const project = await Project.findByIdAndUpdate(req.params.id, { progression }, { new: true });
    res.json({ success: true, data: { progression, project } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};