const Application = require('../models/Application');
const Subject     = require('../models/Subject');
const Project     = require('../models/Project');
const Milestone   = require('../models/Milestone');
const Group       = require('../models/Group');
const { createNotification } = require('../utils/notifications');

// POST /api/applications/subject/:subjectId  — group applies to a subject
exports.apply = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Sujet introuvable' });
    if (subject.statut !== 'validé') return res.status(400).json({ success: false, message: 'Ce sujet n\'est pas disponible' });

    // Find the group of the requesting student
    const group = await Group.findOne({ membres: req.user.id })
      .populate('membres', 'nom prenom _id');
    if (!group) return res.status(400).json({ success: false, message: 'Vous devez d\'abord créer ou rejoindre un groupe.' });
    if (!group.chef) return res.status(400).json({ success: false, message: 'Erreur: groupe sans chef défini.' });
    if (group.chef.toString() !== req.user.id.toString())
      return res.status(403).json({ success: false, message: 'Seul le chef du groupe peut postuler.' });

    const existing = await Application.findOne({ groupId: group._id, sujetId: req.params.subjectId });
    if (existing) return res.status(400).json({ success: false, message: 'Votre groupe a déjà postulé à ce sujet.' });

    const app = await Application.create({
      groupId:    group._id,
      sujetId:    req.params.subjectId,
      motivation: req.body.motivation,
    });

    subject.nombreCandidatures = (subject.nombreCandidatures || 0) + 1;
    await subject.save();

    await createNotification(
      subject.encadrantId,
      `📋 Nouvelle candidature du groupe "${group.nom}" pour "${subject.titre}"`,
      'info'
    );

    res.status(201).json({ success: true, data: app });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// GET /api/applications
exports.getApplications = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'ROLE_STUDENT') {
      // Find the student's group
      const group = await Group.findOne({ membres: req.user.id });
      if (!group) return res.json({ success: true, data: [] });
      query.groupId = group._id;
    }

    if (req.user.role === 'ROLE_SUPERVISOR') {
      const subjects = await Subject.find({ encadrantId: req.user.id }).select('_id');
      query.sujetId = { $in: subjects.map(s => s._id) };
    }

    if (req.query.statut) query.statut = req.query.statut;

    const applications = await Application.find(query)
      .populate({
        path: 'groupId',
        populate: [
          { path: 'chef', select: 'nom prenom email departement' },
          { path: 'membres', select: 'nom prenom email departement' },
        ]
      })
      .populate('sujetId', 'titre technologies statut encadrantId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: applications });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT /api/applications/:id  — supervisor validates or refuses
exports.updateApplication = async (req, res) => {
  try {
    const { statut, commentaireEncadrant } = req.body;
    const app = await Application.findById(req.params.id)
      .populate({ path: 'groupId', populate: { path: 'membres', select: '_id nom prenom' } })
      .populate('sujetId');

    if (!app) return res.status(404).json({ success: false, message: 'Candidature introuvable' });

    app.statut = statut;
    app.commentaireEncadrant = commentaireEncadrant;
    await app.save();

    if (statut === 'accepté') {
      const memberIds = app.groupId.membres.map(m => m._id);

      // Create project with ALL group members
      const project = await Project.create({
        sujetId:    app.sujetId._id,
        groupId:    app.groupId._id,
        etudiants:  memberIds,
        encadrantId: req.user.id,
        dateFin:    req.body.dateFin,
      });

      // Default milestones
      const defaultMilestones = ['Cahier des charges', 'Développement', 'Tests', 'Documentation', 'Soutenance'];
      for (let i = 0; i < defaultMilestones.length; i++) {
        await Milestone.create({ projectId: project._id, nomEtape: defaultMilestones[i], ordre: i + 1 });
      }

      await Subject.findByIdAndUpdate(app.sujetId._id, { statut: 'complet' });

      // Notify ALL group members
      for (const memberId of memberIds) {
        await createNotification(
          memberId,
          `🎉 Votre groupe "${app.groupId.nom}" a été accepté pour "${app.sujetId.titre}"! Le projet est prêt.`,
          'success',
          `/projects/${project._id}`
        );
      }
    } else {
      // Notify all group members of refusal
      for (const member of app.groupId.membres) {
        await createNotification(
          member._id,
          `❌ Votre groupe a été refusé pour "${app.sujetId.titre}". ${commentaireEncadrant || ''}`,
          'error'
        );
      }
    }

    res.json({ success: true, data: app });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// DELETE /api/applications/:id — chef cancels application
exports.deleteApplication = async (req, res) => {
  try {
    const group = await Group.findOne({ chef: req.user.id });
    if (!group) return res.status(403).json({ success: false, message: 'Seul le chef du groupe peut annuler.' });
    const app = await Application.findOneAndDelete({ _id: req.params.id, groupId: group._id });
    if (!app) return res.status(404).json({ success: false, message: 'Candidature introuvable' });
    res.json({ success: true, message: 'Candidature annulée' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
