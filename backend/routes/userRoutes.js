const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus, getSupervisors } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/supervisors', getSupervisors);
router.use(authorize('ROLE_ADMIN'));
router.get('/', getAllUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle-status', toggleUserStatus);

module.exports = router;
