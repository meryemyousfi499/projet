const Evaluation = require('../models/Evaluation');
const { createNotification } = require('../utils/notifications');
const Project = require('../models/Project');

exports.getEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.findOne({ projectId: req.params.projectId })
      .populate('evaluateurId', 'nom prenom')
      .exec(); // L8 ✅
    res.json({ success: true, data: evaluation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOrUpdateEvaluation = async (req, res) => {
  try {
    const { noteEncadrant, noteJury, commentaireEncadrant, commentaireJury } = req.body;
    let evaluation = await Evaluation.findOne({ projectId: req.params.projectId }).exec(); // L18 ✅
    if (evaluation) {
      evaluation.noteEncadrant = noteEncadrant ?? evaluation.noteEncadrant;
      evaluation.noteJury = noteJury ?? evaluation.noteJury;
      evaluation.commentaireEncadrant = commentaireEncadrant ?? evaluation.commentaireEncadrant;
      evaluation.commentaireJury = commentaireJury ?? evaluation.commentaireJury;
      evaluation.evaluateurId = req.user.id;
      await evaluation.save();
    } else {
      evaluation = await Evaluation.create({
        projectId: req.params.projectId,
        noteEncadrant,
        noteJury,
        commentaireEncadrant,
        commentaireJury,
        evaluateurId: req.user.id
      });
    }
    const project = await Project.findById(req.params.projectId)
      .populate('etudiants', '_id')
      .exec(); // L37 ✅
    if (project && evaluation.noteFinale != null) {
      for (const student of project.etudiants) {
        await createNotification(student._id, `Your project has been evaluated. Final grade: ${evaluation.noteFinale}/20`, 'success');
      }
    }
    res.json({ success: true, data: evaluation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};