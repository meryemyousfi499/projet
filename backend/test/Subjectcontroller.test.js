jest.mock('../models/Subject');
jest.mock('../models/User');
jest.mock('../utils/notifications');
const Subject = require('../models/Subject');
const User    = require('../models/User');
const { createNotification } = require('../utils/notifications');

const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  validateSubject,
  deleteSubject,
  getMySupervisorSubjects,
} = require('../controllers/subjectController');

const { chain, mockRes } = require('./helpers');

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('subjectController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
    createNotification.mockResolvedValue(true);
  });

  // ─── getAllSubjects ────────────────────────────────────────────────────────

  describe('getAllSubjects', () => {
    it('returns paginated subjects with no filters', async () => {
      const req = { query: {} };
      Subject.countDocuments = jest.fn().mockReturnValue(chain(20));
      Subject.find = jest.fn().mockReturnValue(chain([{ _id: 's1', titre: 'PFE IA' }]));

      await getAllSubjects(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, total: 20, page: 1 }),
      );
    });

    it('applies statut filter', async () => {
      const req = { query: { statut: 'validé' } };
      Subject.countDocuments = jest.fn().mockReturnValue(chain(5));
      Subject.find = jest.fn().mockReturnValue(chain([]));

      await getAllSubjects(req, res);

      expect(Subject.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ statut: 'validé' }));
    });

    it('applies technology filter with regex', async () => {
      const req = { query: { technology: 'React' } };
      Subject.countDocuments = jest.fn().mockReturnValue(chain(3));
      Subject.find = jest.fn().mockReturnValue(chain([]));

      await getAllSubjects(req, res);

      expect(Subject.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ technologies: { $regex: 'React', $options: 'i' } }),
      );
    });

    it('applies search filter on titre and description', async () => {
      const req = { query: { search: 'machine learning' } };
      Subject.countDocuments = jest.fn().mockReturnValue(chain(2));
      Subject.find = jest.fn().mockReturnValue(chain([]));

      await getAllSubjects(req, res);

      expect(Subject.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
    });

    it('respects custom page and limit', async () => {
      const req = { query: { page: '2', limit: '5' } };
      Subject.countDocuments = jest.fn().mockReturnValue(chain(15));
      Subject.find = jest.fn().mockReturnValue(chain([]));

      await getAllSubjects(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.page).toBe(2);
      expect(call.pages).toBe(3); // ceil(15/5)
    });

    it('returns 500 on error', async () => {
      const req = { query: {} };
      Subject.countDocuments = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getAllSubjects(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getSubjectById ───────────────────────────────────────────────────────

  describe('getSubjectById', () => {
    it('returns subject by id', async () => {
      const req = { params: { id: 'subjId' } };
      const subject = { _id: 'subjId', titre: 'PFE Data' };
      Subject.findById = jest.fn().mockReturnValue(chain(subject));

      await getSubjectById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: subject }));
    });

    it('returns 404 when subject not found', async () => {
      const req = { params: { id: 'subjId' } };
      Subject.findById = jest.fn().mockReturnValue(chain(null));

      await getSubjectById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'subjId' } };
      Subject.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getSubjectById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── createSubject ────────────────────────────────────────────────────────

  describe('createSubject', () => {
    it('creates subject and notifies all admins', async () => {
      const req = {
        body: { titre: 'PFE Blockchain', description: 'Desc', technologies: ['Node.js'] },
        user: { id: 'supId' },
      };
      const newSubject = { _id: 'subjId', titre: 'PFE Blockchain' };
      Subject.create = jest.fn().mockResolvedValue(newSubject);
      User.find = jest.fn().mockReturnValue(chain([{ _id: 'admin1' }, { _id: 'admin2' }]));

      await createSubject(req, res);

      expect(Subject.create).toHaveBeenCalledWith(expect.objectContaining({ encadrantId: 'supId' }));
      expect(createNotification).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 on validation error', async () => {
      const req = { body: {}, user: { id: 'supId' } };
      Subject.create = jest.fn().mockRejectedValue(new Error('Validation error'));

      await createSubject(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── updateSubject ────────────────────────────────────────────────────────

  describe('updateSubject', () => {
    it('returns 404 when subject not found', async () => {
      const req = { params: { id: 'subjId' }, body: {}, user: { id: 'supId', role: 'ROLE_SUPERVISOR' } };
      Subject.findById = jest.fn().mockReturnValue(chain(null));

      await updateSubject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when supervisor tries to update someone else\'s subject', async () => {
      const req = {
        params: { id: 'subjId' },
        body: {},
        user: { id: 'sup1', role: 'ROLE_SUPERVISOR' },
      };
      Subject.findById = jest.fn().mockReturnValue(
        chain({ _id: 'subjId', encadrantId: { toString: () => 'sup2' } }),
      );

      await updateSubject(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows admin to update any subject', async () => {
      const req = {
        params: { id: 'subjId' },
        body: { titre: 'Updated' },
        user: { id: 'adminId', role: 'ROLE_ADMIN' },
      };
      Subject.findById = jest.fn().mockReturnValue(
        chain({ _id: 'subjId', encadrantId: { toString: () => 'sup2' } }),
      );
      const updated = { _id: 'subjId', titre: 'Updated' };
      Subject.findByIdAndUpdate = jest.fn().mockReturnValue(chain(updated));

      await updateSubject(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
    });

    it('allows supervisor to update their own subject', async () => {
      const req = {
        params: { id: 'subjId' },
        body: { titre: 'Updated' },
        user: { id: 'supId', role: 'ROLE_SUPERVISOR' },
      };
      Subject.findById = jest.fn().mockReturnValue(
        chain({ _id: 'subjId', encadrantId: { toString: () => 'supId' } }),
      );
      Subject.findByIdAndUpdate = jest.fn().mockReturnValue(chain({ _id: 'subjId', titre: 'Updated' }));

      await updateSubject(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── validateSubject ──────────────────────────────────────────────────────

  describe('validateSubject', () => {
    it('returns 404 when subject not found', async () => {
      const req = { params: { id: 'subjId' }, body: { statut: 'validé' } };
      Subject.findByIdAndUpdate = jest.fn().mockReturnValue(chain(null));

      await validateSubject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('validates subject and notifies supervisor with success', async () => {
      const req = { params: { id: 'subjId' }, body: { statut: 'validé', commentaireAdmin: '' } };
      const subject = { _id: 'subjId', titre: 'PFE Test', encadrantId: { _id: 'supId' } };
      Subject.findByIdAndUpdate = jest.fn().mockReturnValue(chain(subject));

      await validateSubject(req, res);

      expect(createNotification).toHaveBeenCalledWith('supId', expect.stringContaining('approved'), 'success');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('rejects subject and notifies supervisor with error', async () => {
      const req = {
        params: { id: 'subjId' },
        body: { statut: 'rejeté', commentaireAdmin: 'Hors scope' },
      };
      const subject = { _id: 'subjId', titre: 'PFE Test', encadrantId: { _id: 'supId' } };
      Subject.findByIdAndUpdate = jest.fn().mockReturnValue(chain(subject));

      await validateSubject(req, res);

      expect(createNotification).toHaveBeenCalledWith('supId', expect.stringContaining('rejected'), 'error');
    });
  });

  // ─── deleteSubject ────────────────────────────────────────────────────────

  describe('deleteSubject', () => {
    it('returns 404 when subject not found', async () => {
      const req = { params: { id: 'subjId' } };
      Subject.findByIdAndDelete = jest.fn().mockReturnValue(chain(null));

      await deleteSubject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes subject successfully', async () => {
      const req = { params: { id: 'subjId' } };
      Subject.findByIdAndDelete = jest.fn().mockReturnValue(chain({ _id: 'subjId' }));

      await deleteSubject(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'subjId' } };
      Subject.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await deleteSubject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getMySupervisorSubjects ──────────────────────────────────────────────

  describe('getMySupervisorSubjects', () => {
    it('returns subjects belonging to current supervisor', async () => {
      const req = { user: { id: 'supId' } };
      const subjects = [{ _id: 's1', titre: 'PFE 1' }, { _id: 's2', titre: 'PFE 2' }];
      Subject.find = jest.fn().mockReturnValue(chain(subjects));

      await getMySupervisorSubjects(req, res);

      expect(Subject.find).toHaveBeenCalledWith({ encadrantId: 'supId' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: subjects }));
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'supId' } };
      Subject.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getMySupervisorSubjects(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});