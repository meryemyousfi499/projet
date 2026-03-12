const User = require('../models/User');
const Subject = require('../models/Subject');
const Project = require('../models/Project');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'ROLE_STUDENT' });
    const totalSupervisors = await User.countDocuments({ role: 'ROLE_SUPERVISOR' });
    const totalSubjects = await Subject.countDocuments();
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ statut: 'en cours' });
    const completedProjects = await Project.countDocuments({ statut: 'terminé' });
    const pendingSubjects = await Subject.countDocuments({ statut: 'proposé' });
    const pendingApplications = await Application.countDocuments({ statut: 'en attente' });
    
    const projectsByDept = await User.aggregate([
      { $match: { role: 'ROLE_SUPERVISOR' } },
      { $group: { _id: '$departement', count: { $sum: 1 } } }
    ]);

    const recentProjects = await Project.find()
      .populate('sujetId', 'titre')
      .populate('etudiants', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(5);

    const evaluations = await Evaluation.find({ noteFinale: { $ne: null } });
    const avgGrade = evaluations.length > 0
      ? (evaluations.reduce((acc, e) => acc + e.noteFinale, 0) / evaluations.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        totalUsers, totalStudents, totalSupervisors,
        totalSubjects, totalProjects, activeProjects,
        completedProjects, pendingSubjects, pendingApplications,
        projectsByDept, recentProjects, avgGrade
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSupervisorDashboard = async (req, res) => {
  try {
    const mySubjects = await Subject.countDocuments({ encadrantId: req.user.id });
    const myProjects = await Project.countDocuments({ encadrantId: req.user.id });
    const activeProjects = await Project.countDocuments({ encadrantId: req.user.id, statut: 'en cours' });
    const subjects = await Subject.find({ encadrantId: req.user.id }).select('_id');
    const subjectIds = subjects.map(s => s._id);
    const pendingApplications = await Application.countDocuments({ sujetId: { $in: subjectIds }, statut: 'en attente' });
    const projects = await Project.find({ encadrantId: req.user.id })
      .populate('sujetId', 'titre')
      .populate('etudiants', 'nom prenom')
      .sort({ createdAt: -1 }).limit(5);
    res.json({ success: true, data: { mySubjects, myProjects, activeProjects, pendingApplications, recentProjects: projects } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentDashboard = async (req, res) => {
  try {
    const Group = require('../models/Group');
    const group = await Group.findOne({ membres: req.user.id });
    const myApplications = group
      ? await Application.countDocuments({ groupId: group._id })
      : 0;

    // Find project via direct etudiants OR via group
    let projectQuery = { etudiants: req.user.id };
    if (group) {
      projectQuery = { $or: [{ etudiants: req.user.id }, { groupId: group._id }] };
    }
    const myProject = await Project.findOne(projectQuery)
      .populate('sujetId', 'titre technologies')
      .populate('encadrantId', 'nom prenom email');
    let evaluation = null;
    if (myProject) {
      evaluation = await Evaluation.findOne({ projectId: myProject._id });
    }
    res.json({ success: true, data: { myApplications, myProject, evaluation } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};