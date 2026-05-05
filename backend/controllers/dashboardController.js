const User = require('../models/User');
const Subject = require('../models/Subject');
const Project = require('../models/Project');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments().exec();                                    // L9  ✅
    const totalStudents = await User.countDocuments({ role: 'ROLE_STUDENT' }).exec();        // L10 ✅
    const totalSupervisors = await User.countDocuments({ role: 'ROLE_SUPERVISOR' }).exec();  // L11 ✅
    const totalSubjects = await Subject.countDocuments().exec();                             // L12 ✅
    const totalProjects = await Project.countDocuments().exec();                             // L13 ✅
    const activeProjects = await Project.countDocuments({ statut: 'en cours' }).exec();     // L14 ✅
    const completedProjects = await Project.countDocuments({ statut: 'terminé' }).exec();   // L15 ✅
    const pendingSubjects = await Subject.countDocuments({ statut: 'proposé' }).exec();     // L16 ✅
    const pendingApplications = await Application.countDocuments({ statut: 'en attente' }).exec(); // L17 ✅

    const projectsByDept = await User.aggregate([
      { $match: { role: 'ROLE_SUPERVISOR' } },
      { $group: { _id: '$departement', count: { $sum: 1 } } }
    ]).exec();

    const recentProjects = await Project.find()
      .populate('sujetId', 'titre')
      .populate('etudiants', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();                                                                               // L22 ✅

    const evaluations = await Evaluation.find({ noteFinale: { $ne: null } }).exec();        // L28 ✅

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
    const mySubjects = await Subject.countDocuments({ encadrantId: req.user.id }).exec();                        // L30 ✅
    const myProjects = await Project.countDocuments({ encadrantId: req.user.id }).exec();                        // L51 ✅
    const activeProjects = await Project.countDocuments({ encadrantId: req.user.id, statut: 'en cours' }).exec(); // L52 ✅
    const subjects = await Subject.find({ encadrantId: req.user.id }).select('_id').exec();                      // L53 ✅
    const subjectIds = subjects.map(s => s._id);
    const pendingApplications = await Application.countDocuments({ sujetId: { $in: subjectIds }, statut: 'en attente' }).exec(); // L54 ✅
    const projects = await Project.find({ encadrantId: req.user.id })
      .populate('sujetId', 'titre')
      .populate('etudiants', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();                                                                                                    // L56 ✅

    res.json({ success: true, data: { mySubjects, myProjects, activeProjects, pendingApplications, recentProjects: projects } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentDashboard = async (req, res) => {
  try {
    const Group = require('../models/Group');
    const group = await Group.findOne({ membres: req.user.id }).exec();                      // L54 ✅
    const myApplications = group
      ? await Application.countDocuments({ groupId: group._id }).exec()                     // L56 ✅
      : 0;

    let projectQuery = { etudiants: req.user.id };
    if (group) {
      projectQuery = { $or: [{ etudiants: req.user.id }, { groupId: group._id }] };
    }

    const myProject = await Project.findOne(projectQuery)
      .populate('sujetId', 'titre technologies')
      .populate('encadrantId', 'nom prenom email')
      .exec();                                                                               // L60 ✅

    let evaluation = null;
    if (myProject) {
      evaluation = await Evaluation.findOne({ projectId: myProject._id }).exec();           // L70 ✅
    }

    res.json({ success: true, data: { myApplications, myProject, evaluation } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};