const express = require('express');
const router = express.Router();
const { getAdminDashboard, getSupervisorDashboard, getStudentDashboard } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/admin', authorize('ROLE_ADMIN'), getAdminDashboard);
router.get('/supervisor', authorize('ROLE_SUPERVISOR'), getSupervisorDashboard);
router.get('/student', authorize('ROLE_STUDENT'), getStudentDashboard);

module.exports = router;
