const express = require('express');
const router = express.Router();
const { getProjects, getProjectById, updateProject, updateProgression } = require('../controllers/projectController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', authorize('ROLE_SUPERVISOR', 'ROLE_ADMIN'), updateProject);
router.patch('/:id/progression', updateProgression);

module.exports = router;
