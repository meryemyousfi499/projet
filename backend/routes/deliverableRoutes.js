const express = require('express');
const router = express.Router();
const { getDeliverables, uploadDeliverable, deleteDeliverable } = require('../controllers/deliverableController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(protect);
router.get('/project/:projectId', getDeliverables);
router.post('/project/:projectId', upload.single('file'), uploadDeliverable);
router.delete('/:id', deleteDeliverable);

module.exports = router;
