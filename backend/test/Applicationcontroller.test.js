jest.mock('../models/Application');
jest.mock('../models/Subject');
jest.mock('../models/Project');
jest.mock('../models/Milestone');
jest.mock('../models/Group');
jest.mock('../utils/notifications');

const Application = require('../models/Application');
const Subject     = require('../models/Subject');
const Project     = require('../models/Project');
const Milestone   = require('../models/Milestone');
const Group       = require('../models/Group');
const { createNotification } = require('../utils/notifications');

const {
  apply,
  getApplications,
  updateApplication,
  deleteApplication,
} = require('../controllers/applicationController');

const { chain, mockRes } = require('./helpers');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeGroup = (overrides = {}) => ({
  _id: 'gId',
  chef: 'userId123',
  membres: [{ _id: 'stu1', nom: 'A', prenom: 'B' }],
  nom: 'MonGroupe',
  ...overrides,
});

const makeSubject = (overrides = {}) => ({
  _id: 'subjectId123',
  statut: 'validé',
  encadrantId: 'encId',
  titre: 'PFE Test',
  nombreCandidatures: 0,
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('applicationController', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockRes();
    createNotification.mockResolvedValue(true);
  });

  // ─── apply ────────────────────────────────────────────────────────────────

  describe('apply', () => {
    let req;

    beforeEach(() => {
      req = {
        params: { subjectId: 'subjectId123' },
        body: { motivation: 'Très motivé' },
        user: { id: 'userId123' },
      };
    });

    it('returns 404 when subject does not exist', async () => {
      Subject.findById = jest.fn().mockReturnValue(chain(null));

      await apply(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 400 when subject is not validated', async () => {
      Subject.findById = jest.fn().mockReturnValue(chain(makeSubject({ statut: 'proposé' })));

      await apply(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('disponible') }),
      );
    });

    it('returns 400 when user has no group', async () => {
      Subject.findById = jest.fn().mockReturnValue(chain(makeSubject()));
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await apply(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 403 when user is not the group leader', async () => {
      Subject.findById = jest.fn().mockReturnValue(chain(makeSubject()));
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup({ chef: 'otherUserId' })));

      await apply(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when application already exists', async () => {
      Subject.findById = jest.fn().mockReturnValue(chain(makeSubject()));
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup()));
      Application.findOne = jest.fn().mockReturnValue(chain({ _id: 'existingApp' }));

      await apply(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates application and notifies supervisor', async () => {
      const subject = makeSubject();
      Subject.findById = jest.fn().mockReturnValue(chain(subject));
      Group.findOne = jest.fn().mockReturnValue(chain(makeGroup()));
      Application.findOne = jest.fn().mockReturnValue(chain(null));
      Application.create = jest.fn().mockResolvedValue({ _id: 'newApp' });

      await apply(req, res);

      expect(Application.create).toHaveBeenCalled();
      expect(subject.save).toHaveBeenCalled();
      expect(createNotification).toHaveBeenCalledWith(
        'encId',
        expect.stringContaining('MonGroupe'),
        'info',
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 400 on unexpected error', async () => {
      Subject.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB error')) });

      await apply(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── getApplications ─────────────────────────────────────────────────────

  describe('getApplications', () => {
    it('returns empty array when student has no group', async () => {
      const req = { user: { id: 'userId123', role: 'ROLE_STUDENT' }, query: {} };
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await getApplications(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('returns applications filtered by group for student', async () => {
      const req = { user: { id: 'userId123', role: 'ROLE_STUDENT' }, query: {} };
      Group.findOne = jest.fn().mockReturnValue(chain({ _id: 'gId' }));
      Application.find = jest.fn().mockReturnValue(chain([{ _id: 'app1' }]));

      await getApplications(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(Application.find).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'gId' }));
    });

    it('returns applications filtered by subjects for supervisor', async () => {
      const req = { user: { id: 'supId', role: 'ROLE_SUPERVISOR' }, query: {} };
      Subject.find = jest.fn().mockReturnValue(chain([{ _id: 's1' }, { _id: 's2' }]));
      Application.find = jest.fn().mockReturnValue(chain([]));

      await getApplications(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('filters by statut when query param provided', async () => {
      const req = { user: { id: 'adminId', role: 'ROLE_ADMIN' }, query: { statut: 'accepté' } };
      Application.find = jest.fn().mockReturnValue(chain([]));

      await getApplications(req, res);

      expect(Application.find).toHaveBeenCalledWith(expect.objectContaining({ statut: 'accepté' }));
    });

    it('returns 500 on unexpected error', async () => {
      const req = { user: { id: 'adminId', role: 'ROLE_ADMIN' }, query: {} };
      Application.find = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('DB down')) });

      await getApplications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateApplication ────────────────────────────────────────────────────

  describe('updateApplication', () => {
    let req;

    beforeEach(() => {
      req = {
        params: { id: 'appId' },
        body: { statut: 'accepté', dateFin: '2025-12-31' },
        user: { id: 'supId' },
      };
    });

    it('returns 404 when application not found', async () => {
      Application.findById = jest.fn().mockReturnValue(chain(null));

      await updateApplication(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('accepts application, creates project and milestones', async () => {
      const mockApp = {
        statut: 'en attente',
        commentaireEncadrant: '',
        groupId: { _id: 'gId', nom: 'G1', membres: [{ _id: 'stu1' }] },
        sujetId: { _id: 'subjId', titre: 'PFE' },
        save: jest.fn().mockResolvedValue(true),
      };
      Application.findById = jest.fn().mockReturnValue(chain(mockApp));
      Project.create = jest.fn().mockResolvedValue({ _id: 'projId' });
      Milestone.create = jest.fn().mockResolvedValue({});
      Subject.findByIdAndUpdate = jest.fn().mockReturnValue(chain({}));

      await updateApplication(req, res);

      expect(Project.create).toHaveBeenCalled();
      expect(Milestone.create).toHaveBeenCalledTimes(5);
      expect(Subject.findByIdAndUpdate).toHaveBeenCalledWith('subjId', { statut: 'complet' });
      expect(createNotification).toHaveBeenCalledWith('stu1', expect.any(String), 'success', expect.any(String));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('rejects application and notifies all members', async () => {
      req.body = { statut: 'refusé', commentaireEncadrant: 'Dossier incomplet' };
      const mockApp = {
        statut: 'en attente',
        commentaireEncadrant: '',
        groupId: { _id: 'gId', nom: 'G1', membres: [{ _id: 'stu1' }, { _id: 'stu2' }] },
        sujetId: { _id: 'subjId', titre: 'PFE' },
        save: jest.fn().mockResolvedValue(true),
      };
      Application.findById = jest.fn().mockReturnValue(chain(mockApp));

      await updateApplication(req, res);

      expect(createNotification).toHaveBeenCalledTimes(2);
      expect(createNotification).toHaveBeenCalledWith('stu1', expect.stringContaining('refusé'), 'error');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── deleteApplication ────────────────────────────────────────────────────

  describe('deleteApplication', () => {
    let req;

    beforeEach(() => {
      req = { params: { id: 'appId' }, user: { id: 'userId123' } };
    });

    it('returns 403 when user is not a group leader', async () => {
      Group.findOne = jest.fn().mockReturnValue(chain(null));

      await deleteApplication(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 404 when application not found for this group', async () => {
      Group.findOne = jest.fn().mockReturnValue(chain({ _id: 'gId' }));
      Application.findOneAndDelete = jest.fn().mockReturnValue(chain(null));

      await deleteApplication(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes application successfully', async () => {
      Group.findOne = jest.fn().mockReturnValue(chain({ _id: 'gId' }));
      Application.findOneAndDelete = jest.fn().mockReturnValue(chain({ _id: 'appId' }));

      await deleteApplication(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});