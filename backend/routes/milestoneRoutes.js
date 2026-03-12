const express = require('express');
const router = express.Router();
const { getMilestones, createMilestone, updateMilestone, deleteMilestone } = require('../controllers/milestoneController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/project/:projectId', getMilestones);
router.post('/project/:projectId', authorize('ROLE_SUPERVISOR', 'ROLE_ADMIN'), createMilestone);
router.put('/:id', updateMilestone);
router.delete('/:id', authorize('ROLE_SUPERVISOR', 'ROLE_ADMIN'), deleteMilestone);

module.exports = router;
