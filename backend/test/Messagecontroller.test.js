jest.mock('../models/Message');
jest.mock('../models/Group');
jest.mock('../models/Project');
jest.mock('../utils/notifications');

const Message = require('../models/Message');
const Group   = require('../models/Group');
const Project = require('../models/Project');
const { createNotification } = require('../utils/notifications');

const {
  getMessages,
  sendMessage,
  sendFile,
  getUnreadCounts,
} = require('../controllers/messageController');

const { chain, mockRes } = require('./helpers');

// chain étendu pour .populate().sort().exec() et .select().exec()
const chainFull = (value) => ({
  populate:   jest.fn().mockReturnThis(),
  select:     jest.fn().mockReturnThis(),
  sort:       jest.fn().mockReturnThis(),
  limit:      jest.fn().mockReturnThis(),
  exec:       jest.fn().mockResolvedValue(value),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeProject = (overrides = {}) => {
  const proj = {
    _id: 'projId',
    etudiants: [{ toString: () => 'stuId', _id: 'stuId' }],
    encadrantId: { toString: () => 'supId', valueOf: () => 'supId' },
    groupId: { toString: () => 'gId' },
    populate: jest.fn().mockImplementation(function () {
      this.etudiants = [{ _id: 'stuId' }];
      return Promise.resolve(this);
    }),
    ...overrides,
  };
  return proj;
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('messageController', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockRes();
    createNotification.mockResolvedValue(true);
  });

  // ─── checkAccess — group fallback (lines 12-16) ───────────────────────────

  describe('checkAccess — group fallback path', () => {
    it('grants access when user is in a group matching project.groupId', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'groupMemberId' } };

      const project = makeProject({
        etudiants: [{ toString: () => 'stuId', _id: 'stuId' }],
        encadrantId: { toString: () => 'supId' },
        groupId: { toString: () => 'gId' },
      });
      Project.findById   = jest.fn().mockReturnValue(chain(project));
      Group.findOne      = jest.fn().mockReturnValue(chain({ _id: { toString: () => 'gId' } }));
      Message.find       = jest.fn().mockReturnValue(chainFull([]));
      Message.updateMany = jest.fn().mockReturnValue(chain({}));

      await getMessages(req, res);

      expect(Group.findOne).toHaveBeenCalledWith({ membres: 'groupMemberId' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('denies access when group._id does not match project.groupId', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'strangerId' } };

      const project = makeProject({
        etudiants: [{ toString: () => 'stuId' }],
        encadrantId: { toString: () => 'supId' },
        groupId: { toString: () => 'gId' },
      });
      Project.findById = jest.fn().mockReturnValue(chain(project));
      Group.findOne    = jest.fn().mockReturnValue(chain({ _id: { toString: () => 'otherGroup' } }));

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('denies access when user is not in any group', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'nobodyId' } };

      const project = makeProject({
        etudiants: [{ toString: () => 'stuId' }],
        encadrantId: { toString: () => 'supId' },
        groupId: { toString: () => 'gId' },
      });
      Project.findById = jest.fn().mockReturnValue(chain(project));
      Group.findOne    = jest.fn().mockReturnValue(chain(null));

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('denies access when project has no groupId', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'strangerId' } };

      const project = makeProject({
        etudiants: [{ toString: () => 'stuId' }],
        encadrantId: { toString: () => 'supId' },
        groupId: null,
      });
      Project.findById = jest.fn().mockReturnValue(chain(project));
      Group.findOne    = jest.fn().mockReturnValue(chain({ _id: { toString: () => 'gId' } }));

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── getMessages ──────────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('returns 403 when project not found', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'unknownId' } };
      Project.findById = jest.fn().mockReturnValue(chain(null));

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns messages and marks them as read for supervisor', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'supId' } };
      Project.findById   = jest.fn().mockReturnValue(chain(makeProject()));
      Message.find       = jest.fn().mockReturnValue(chainFull([{ _id: 'm1', content: 'Hi' }]));
      Message.updateMany = jest.fn().mockReturnValue(chain({}));

      await getMessages(req, res);

      expect(Message.updateMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('grants access to a student who is project member', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'stuId' } };
      Project.findById   = jest.fn().mockReturnValue(chain(makeProject()));
      Message.find       = jest.fn().mockReturnValue(chainFull([]));
      Message.updateMany = jest.fn().mockReturnValue(chain({}));

      await getMessages(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 on error', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'supId' } };
      Project.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── sendMessage ──────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('returns 403 when user has no project access', async () => {
      const req = { params: { projectId: 'projId' }, body: { content: 'Hello' }, user: { id: 'unknownId' } };
      Project.findById = jest.fn().mockReturnValue(chain(null));

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when message content is empty', async () => {
      const req = { params: { projectId: 'projId' }, body: { content: '   ' }, user: { id: 'supId' } };
      Project.findById = jest.fn().mockReturnValue(chain(makeProject()));

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('supervisor sends message → notifies etudiants', async () => {
      const req = {
        params: { projectId: 'projId' },
        body:   { content: 'Hello team' },
        user:   { id: 'supId', nom: 'Prof', prenom: 'Michel' },
      };
      const project = makeProject();
      Project.findById = jest.fn().mockReturnValue(chain(project));
      Message.create   = jest.fn().mockResolvedValue({ _id: 'mId' });
      Message.findById = jest.fn().mockReturnValue(chainFull({ _id: 'mId', content: 'Hello team' }));

      await sendMessage(req, res);

      expect(project.populate).toHaveBeenCalledWith('etudiants', '_id');
      expect(createNotification).toHaveBeenCalledWith(
        'stuId',
        expect.stringContaining('Michel'),
        'info',
        expect.any(String),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('student sends message → notifies supervisor', async () => {
      const req = {
        params: { projectId: 'projId' },
        body:   { content: 'Question' },
        user:   { id: 'stuId', nom: 'Etu', prenom: 'Lea' },
      };
      const project = makeProject();
      Project.findById = jest.fn().mockReturnValue(chain(project));
      Message.create   = jest.fn().mockResolvedValue({ _id: 'mId' });
      Message.findById = jest.fn().mockReturnValue(chainFull({ _id: 'mId', content: 'Question' }));

      await sendMessage(req, res);

      expect(createNotification).toHaveBeenCalledWith(
        project.encadrantId,
        expect.stringContaining('Lea'),
        'info',
        expect.any(String),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 on error', async () => {
      const req = { params: { projectId: 'projId' }, body: { content: 'Hi' }, user: { id: 'supId', nom: 'P', prenom: 'M' } };
      Project.findById = jest.fn().mockReturnValue(chain(makeProject()));
      Message.create   = jest.fn().mockRejectedValue(new Error('fail'));

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── sendFile ─────────────────────────────────────────────────────────────

  describe('sendFile', () => {
    it('returns 403 when user has no access', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'noAccessId' }, file: undefined };
      Project.findById = jest.fn().mockReturnValue(chain(null));

      await sendFile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when no file is attached', async () => {
      const req = { params: { projectId: 'projId' }, user: { id: 'supId' }, file: undefined, body: {} };
      Project.findById = jest.fn().mockReturnValue(chain(makeProject()));

      await sendFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('supervisor uploads file and notifies students', async () => {
      const req = {
        params: { projectId: 'projId' },
        body:   { caption: 'See attachment' },
        user:   { id: 'supId', nom: 'Prof', prenom: 'Michel' },
        file:   { originalname: 'doc.pdf', filename: 'doc-uuid.pdf', size: 2048 },
      };
      const project = makeProject();
      Project.findById = jest.fn().mockReturnValue(chain(project));
      Message.create   = jest.fn().mockResolvedValue({ _id: 'mId' });
      Message.findById = jest.fn().mockReturnValue(chainFull({ _id: 'mId' }));

      await sendFile(req, res);

      expect(Message.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'file', fileName: 'doc.pdf', filePath: '/uploads/doc-uuid.pdf' }),
      );
      expect(createNotification).toHaveBeenCalledWith(
        'stuId',
        expect.stringContaining('doc.pdf'),
        'info',
        expect.any(String),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('student uploads file and notifies supervisor', async () => {
      const req = {
        params: { projectId: 'projId' },
        body:   { caption: '' },
        user:   { id: 'stuId', nom: 'Etu', prenom: 'Lea' },
        file:   { originalname: 'rapport.pdf', filename: 'rapport-uuid.pdf', size: 512 },
      };
      const project = makeProject();
      Project.findById = jest.fn().mockReturnValue(chain(project));
      Message.create   = jest.fn().mockResolvedValue({ _id: 'mId' });
      Message.findById = jest.fn().mockReturnValue(chainFull({ _id: 'mId' }));

      await sendFile(req, res);

      expect(createNotification).toHaveBeenCalledWith(
        project.encadrantId,
        expect.stringContaining('rapport.pdf'),
        'info',
        expect.any(String),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 on error', async () => {
      const req = {
        params: { projectId: 'projId' },
        body:   {},
        user:   { id: 'supId', nom: 'P', prenom: 'M' },
        file:   { originalname: 'f.pdf', filename: 'f.pdf', size: 100 },
      };
      Project.findById = jest.fn().mockReturnValue(chain(makeProject()));
      Message.create   = jest.fn().mockRejectedValue(new Error('fail'));

      await sendFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── getUnreadCounts ──────────────────────────────────────────────────────

  describe('getUnreadCounts', () => {
    it('returns unread count for supervisor', async () => {
      const req = { user: { id: 'supId', _id: 'supId', role: 'ROLE_SUPERVISOR' } };
      // Project.find().select('_id').exec() — nécessite chainFull
      Project.find      = jest.fn().mockReturnValue(chainFull([{ _id: 'p1' }]));
      Message.aggregate = jest.fn().mockReturnValue(chain([{ _id: 'p1', count: 3 }]));

      await getUnreadCounts(req, res);

      expect(res.json.mock.calls[0][0].data.total).toBe(3);
    });

    it('returns unread count for student with group', async () => {
      const req = { user: { id: 'stuId', _id: 'stuId', role: 'ROLE_STUDENT' } };
      Group.findOne     = jest.fn().mockReturnValue(chain({ _id: 'gId' }));
      Project.find      = jest.fn().mockReturnValue(chainFull([{ _id: 'p1' }]));
      Message.aggregate = jest.fn().mockReturnValue(chain([]));

      await getUnreadCounts(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns unread count for student without group', async () => {
      const req = { user: { id: 'stuId', _id: 'stuId', role: 'ROLE_STUDENT' } };
      Group.findOne     = jest.fn().mockReturnValue(chain(null));
      Project.find      = jest.fn().mockReturnValue(chainFull([]));
      Message.aggregate = jest.fn().mockReturnValue(chain([]));

      await getUnreadCounts(req, res);

      expect(res.json.mock.calls[0][0].data.total).toBe(0);
    });

    it('returns 0 total when no unread messages', async () => {
      const req = { user: { id: 'supId', _id: 'supId', role: 'ROLE_SUPERVISOR' } };
      Project.find      = jest.fn().mockReturnValue(chainFull([]));
      Message.aggregate = jest.fn().mockReturnValue(chain([]));

      await getUnreadCounts(req, res);

      expect(res.json.mock.calls[0][0].data.total).toBe(0);
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'supId', _id: 'supId', role: 'ROLE_SUPERVISOR' } };
      Project.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec:   jest.fn().mockRejectedValue(new Error('fail')),
      });

      await getUnreadCounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});