const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { getMessages, sendMessage, sendFile, getUnreadCounts } = require('../controllers/messageController');

router.use(protect);

router.get('/unread-counts', getUnreadCounts);
router.get('/:projectId', getMessages);
router.post('/:projectId', sendMessage);
router.post('/:projectId/upload', upload.single('file'), sendFile);

module.exports = router;
