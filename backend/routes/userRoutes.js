const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = require('../middlewares/upload'); // ta config multer

const { 
  getAllUsers, getUserById, createUser, 
  updateUser, deleteUser, toggleUserStatus, 
  getSupervisors, updateAvatar // ← ajoute ton contrôleur avatar
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/supervisors', getSupervisors);

// ✅ Route upload avatar — accessible à tout utilisateur connecté (pas admin only)
router.post('/avatar', (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Erreur upload : ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, updateAvatar);

router.use(authorize('ROLE_ADMIN'));
router.get('/', getAllUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle-status', toggleUserStatus);

module.exports = router;
