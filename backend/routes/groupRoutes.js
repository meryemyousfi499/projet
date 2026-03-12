const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  getMyGroup, getMyInvitations, createGroup, inviteMember,
  respondInvitation, leaveGroup, deleteGroup, removeMember, getAllGroups
} = require('../controllers/groupController');

router.use(protect);

// ⚠️ Specific routes MUST come before parameterized routes /:id
router.get('/my',          authorize('ROLE_STUDENT'),               getMyGroup);
router.get('/invitations', authorize('ROLE_STUDENT'),               getMyInvitations);
router.get('/',            authorize('ROLE_SUPERVISOR','ROLE_ADMIN'),getAllGroups);
router.post('/',           authorize('ROLE_STUDENT'),               createGroup);
router.post('/invite',     authorize('ROLE_STUDENT'),               inviteMember);
router.post('/:id/respond',authorize('ROLE_STUDENT'),               respondInvitation);

// DELETE specific routes before wildcard
router.delete('/leave',           authorize('ROLE_STUDENT'), leaveGroup);
router.delete('/members/:userId', authorize('ROLE_STUDENT'), removeMember);
router.delete('/',                authorize('ROLE_STUDENT'), deleteGroup);

module.exports = router;
