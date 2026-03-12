const Milestone = require('../models/Milestone');
const Project = require('../models/Project');

const recalcProgression = async (projectId) => {
  const milestones = await Milestone.find({ projectId });
  const total = milestones.length;
  const done = milestones.filter(m => m.statut === 'terminé').length;
  const progression = total > 0 ? Math.round((done / total) * 100) : 0;
  await Project.findByIdAndUpdate(projectId, { progression });
  return progression;
};

exports.getMilestones = async (req, res) => {
  try {
    const milestones = await Milestone.find({ projectId: req.params.projectId }).sort({ ordre: 1 });
    res.json({ success: true, data: milestones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.create({ ...req.body, projectId: req.params.projectId });
    await recalcProgression(req.params.projectId);
    res.status(201).json({ success: true, data: milestone });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    await recalcProgression(milestone.projectId);
    res.json({ success: true, data: milestone });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndDelete(req.params.id);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    await recalcProgression(milestone.projectId);
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
