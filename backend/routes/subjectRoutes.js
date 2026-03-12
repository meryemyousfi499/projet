const express = require('express');
const router = express.Router();
const { getAllSubjects, getSubjectById, createSubject, updateSubject, validateSubject, deleteSubject, getMySupervisorSubjects } = require('../controllers/subjectController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/', getAllSubjects);
router.get('/my-subjects', authorize('ROLE_SUPERVISOR'), getMySupervisorSubjects);
router.get('/:id', getSubjectById);
router.post('/', authorize('ROLE_SUPERVISOR', 'ROLE_ADMIN'), createSubject);
router.put('/:id', authorize('ROLE_SUPERVISOR', 'ROLE_ADMIN'), updateSubject);
router.patch('/:id/validate', authorize('ROLE_ADMIN'), validateSubject);
router.delete('/:id', authorize('ROLE_ADMIN', 'ROLE_SUPERVISOR'), deleteSubject);

module.exports = router;
