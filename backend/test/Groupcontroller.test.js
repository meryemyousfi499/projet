jest.mock('../models/Group');
jest.mock('../models/User');
jest.mock('../utils/notifications');

const Group = require('../models/Group');
const User  = require('../models/User');
const { createNotification } = require('../utils/notifications');

const {
  getMyGroup,
  getMyInvitations,
  createGroup,
  inviteMember,
  respondInvitation,
  leaveGroup,
  deleteGroup,
  removeMember,
  getAllGroups,
} = require('../controllers/groupController');

const { chain, mockRes } = require('./helpers');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeGroup = (overrides = {}) => ({
  _id: 'gId',
  nom: 'TeamAlpha',
  chef: 'userId123',
  membres: ['userId123'],
  invitations: [],
  hasMember: jest.fn().mockReturnValue(false),
  save: jest.fn().mockResolvedValue(true),
  populate: jest.fn().mockResolvedValue(true),
  ...overrides,
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('groupController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
    createNotification.mockResolvedValue(true);
  });

  // ─── getMyGroup ───────────────────────────────────────────────────────────

  describe('getMyGroup', () => {
    it('returns the group of the current user', async () => {
      const req = { user: { id: 'userId123' } };
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup()));

      await getMyGroup(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns null when user has no group', async () => {
      const req = { user: { id: 'userId123' } };
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await getMyGroup(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    });
  });

  // ─── getMyInvitations ─────────────────────────────────────────────────────

  describe('getMyInvitations', () => {
    it('returns pending invitations for current user', async () => {
      const req = { user: { id: 'userId123' } };
      Group.find = jest.fn().mockReturnValue(chain([makeGroup()]));

      await getMyInvitations(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── createGroup ──────────────────────────────────────────────────────────

  describe('createGroup', () => {
    it('returns 400 when user is already in a group', async () => {
      const req = { user: { id: 'userId123' }, body: { nom: 'NewGroup' } };
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup()));

      await createGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates group and returns it', async () => {
      const req = { user: { id: 'userId123' }, body: { nom: 'NewGroup' } };
      Group.findOne = jest.fn().mockReturnValue(chain(null));
      const newGroup = makeGroup();
      Group.create = jest.fn().mockResolvedValue(newGroup);

      await createGroup(req, res);

      expect(Group.create).toHaveBeenCalledWith(
        expect.objectContaining({ nom: 'NewGroup', chef: 'userId123' }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ─── inviteMember ─────────────────────────────────────────────────────────

  describe('inviteMember', () => {
    const req = {
      user: { id: 'userId123', nom: 'Dupont', prenom: 'Jean' },
      body: { email: 'target@example.com' },
    };

    it('returns 404 when user is not a group leader', async () => {
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await inviteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when target student not found', async () => {
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup()));
      User.findOne = jest.fn().mockReturnValue(chain(null));

      await inviteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when target is already a member', async () => {
      const group = makeGroup({ hasMember: jest.fn().mockReturnValue(true) });
      Group.findOne = jest.fn()
        .mockReturnValueOnce(chain(group))  // leader's group
        .mockReturnValueOnce(chain(null));  // not in another group
      User.findOne = jest.fn().mockReturnValue(chain({ _id: 'targetId' }));

      await inviteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when target is already in another group', async () => {
      Group.findOne = jest.fn()
        .mockReturnValueOnce(chain(makeGroup()))
        .mockReturnValueOnce(chain({ _id: 'otherGroup' }));
      User.findOne = jest.fn().mockReturnValue(chain({ _id: 'targetId' }));

      await inviteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('sends invitation successfully', async () => {
      const group = makeGroup({ invitations: [] });
      Group.findOne = jest.fn()
        .mockReturnValueOnce(chain(group))
        .mockReturnValueOnce(chain(null));
      User.findOne = jest.fn().mockReturnValue(chain({ _id: 'targetId' }));

      await inviteMember(req, res);

      expect(group.invitations).toHaveLength(1);
      expect(group.save).toHaveBeenCalled();
      expect(createNotification).toHaveBeenCalledWith('targetId', expect.any(String), 'info');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── respondInvitation ────────────────────────────────────────────────────

  describe('respondInvitation', () => {
    it('returns 404 when group not found', async () => {
      const req = { params: { id: 'gId' }, body: { statut: 'accepté' }, user: { id: 'userId123' } };
      Group.findById = jest.fn().mockReturnValue(chain(null));

      await respondInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when invitation not found for user', async () => {
      const req = { params: { id: 'gId' }, body: { statut: 'accepté' }, user: { id: 'userId123' } };
      const group = makeGroup({ invitations: [{ userId: { toString: () => 'otherUser' } }] });
      Group.findById = jest.fn().mockReturnValue(chain(group));

      await respondInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('accepts invitation and adds user to group', async () => {
      const req = { params: { id: 'gId' }, body: { statut: 'accepté' }, user: { id: 'userId123', nom: 'D', prenom: 'J' } };
      const inv = { userId: { toString: () => 'userId123' }, statut: 'en attente' };
      const group = makeGroup({ invitations: [inv], membres: [] });
      Group.findById = jest.fn().mockReturnValue(chain(group));
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await respondInvitation(req, res);

      expect(group.membres).toContain('userId123');
      expect(inv.statut).toBe('accepté');
      expect(group.save).toHaveBeenCalled();
    });

    it('declines invitation without adding user', async () => {
      const req = { params: { id: 'gId' }, body: { statut: 'refusé' }, user: { id: 'userId123', nom: 'D', prenom: 'J' } };
      const inv = { userId: { toString: () => 'userId123' }, statut: 'en attente' };
      const group = makeGroup({ invitations: [inv], membres: [] });
      Group.findById = jest.fn().mockReturnValue(chain(group));

      await respondInvitation(req, res);

      expect(group.membres).not.toContain('userId123');
      expect(inv.statut).toBe('refusé');
    });
  });

  // ─── leaveGroup ───────────────────────────────────────────────────────────

  describe('leaveGroup', () => {
    it('returns 404 when user has no group', async () => {
      const req = { user: { id: 'userId123' } };
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await leaveGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when leader tries to leave', async () => {
      const req = { user: { id: 'userId123', nom: 'D', prenom: 'J' } };
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup({ chef: { toString: () => 'userId123' } })));

      await leaveGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('removes user from group members', async () => {
      const req = { user: { id: 'stuId', nom: 'D', prenom: 'J' } };
      const group = makeGroup({ chef: { toString: () => 'userId123' }, membres: [{ toString: () => 'stuId' }, { toString: () => 'userId123' }] });
      Group.findOne = jest.fn().mockReturnValue(chain(group));

      await leaveGroup(req, res);

      expect(group.membres).toHaveLength(1);
      expect(group.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── deleteGroup ──────────────────────────────────────────────────────────

  describe('deleteGroup', () => {
    it('returns 404 when user is not a group leader', async () => {
      const req = { user: { id: 'userId123' } };
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await deleteGroup(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes group successfully', async () => {
      const req = { user: { id: 'userId123' } };
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup()));
      Group.findByIdAndDelete = jest.fn().mockReturnValue(chain({}));

      await deleteGroup(req, res);

      expect(Group.findByIdAndDelete).toHaveBeenCalledWith('gId');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── removeMember ─────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('returns 404 when user is not a group leader', async () => {
      const req = { user: { id: 'userId123' }, params: { userId: 'stu1' } };
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await removeMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('removes member and notifies them', async () => {
      const req = { user: { id: 'userId123' }, params: { userId: 'stu1' } };
      const group = makeGroup({ membres: [{ toString: () => 'stu1' }, { toString: () => 'userId123' }] });
      Group.findOne = jest.fn().mockReturnValue(chain(group));

      await removeMember(req, res);

      expect(group.membres).toHaveLength(1);
      expect(group.save).toHaveBeenCalled();
      expect(createNotification).toHaveBeenCalledWith('stu1', expect.any(String), 'info');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── getAllGroups ─────────────────────────────────────────────────────────

  describe('getAllGroups', () => {
    it('returns all groups', async () => {
      const req = {};
      Group.find = jest.fn().mockReturnValue(chain([makeGroup()]));

      await getAllGroups(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 on error', async () => {
      const req = {};
      Group.find = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getAllGroups(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});