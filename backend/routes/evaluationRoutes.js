const express = require('express');
const router = express.Router();
const { getEvaluation, createOrUpdateEvaluation } = require('../controllers/evaluationController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.get('/project/:projectId', getEvaluation);
router.post('/project/:projectId', authorize('ROLE_SUPERVISOR', 'ROLE_ADMIN'), createOrUpdateEvaluation);

module.exports = router;
