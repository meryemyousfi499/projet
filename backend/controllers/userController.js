const User = require('../models/User');
const mongoose = require('mongoose');
exports.getAllUsers = async (req, res) => {
  try {
    const { role, statut, departement, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (statut) query.statut = statut;
    if (departement) query.departement = departement;
    if (search) query.$or = [
      { nom: { $regex: search, $options: 'i' } },
      { prenom: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    const total = await User.countDocuments(query).exec(); // L15 ✅
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .exec(); // L19 ✅
    res.json({ success: true, data: users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found' });
    }
    const user = await User.findById(req.params.id).exec(); // L28 ✅
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found' });
    }
    const { motDePasse, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).exec(); // L48 ✅
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found' });
    }
    const user = await User.findByIdAndDelete(req.params.id).exec(); // L58 ✅
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found' });
    }
    const user = await User.findById(req.params.id).exec();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.statut = user.statut === 'actif' ? 'inactif' : 'actif';
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: 'ROLE_SUPERVISOR', statut: 'actif' })
      .select('nom prenom email departement')
      .exec();
    res.json({ success: true, data: supervisors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Not found' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: `/uploads/${req.file.filename}` },
      { new: true }
    ).exec();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};