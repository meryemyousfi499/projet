const express = require('express');
const router = express.Router();
const { apply, getApplications, updateApplication, deleteApplication } = require('../controllers/applicationController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/', getApplications);
router.post('/subject/:subjectId', authorize('ROLE_STUDENT'), apply);
router.put('/:id', authorize('ROLE_SUPERVISOR', 'ROLE_ADMIN'), updateApplication);
router.delete('/:id', authorize('ROLE_STUDENT'), deleteApplication);

module.exports = router;
