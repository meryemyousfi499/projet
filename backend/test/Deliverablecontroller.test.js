jest.mock('../models/Deliverable');
jest.mock('../models/Project');
jest.mock('../utils/notifications');

const Deliverable = require('../models/Deliverable');
const Project     = require('../models/Project');
const { createNotification } = require('../utils/notifications');

const {
  getDeliverables,
  uploadDeliverable,
  deleteDeliverable,
} = require('../controllers/deliverableController');

const { chain, mockRes } = require('./helpers');

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('deliverableController', () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockRes();
    createNotification.mockResolvedValue(true);
  });

  // ─── getDeliverables ──────────────────────────────────────────────────────

  describe('getDeliverables', () => {
    it('returns deliverables for a project', async () => {
      const req = { params: { projectId: 'projId' } };
      const deliverables = [{ _id: 'd1', titre: 'Rapport' }];
      Deliverable.find = jest.fn().mockReturnValue(chain(deliverables));

      await getDeliverables(req, res);

      expect(Deliverable.find).toHaveBeenCalledWith({ projectId: 'projId' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: deliverables });
    });

    it('returns 500 on error', async () => {
      const req = { params: { projectId: 'projId' } };
      Deliverable.find = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getDeliverables(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── uploadDeliverable ────────────────────────────────────────────────────

  describe('uploadDeliverable', () => {
    const baseReq = {
      params: { projectId: 'projId' },
      body: { type: 'rapport', titre: 'Rapport Final', version: '1.0', commentaire: 'OK' },
      user: { id: 'stuId' },
    };

    it('returns 400 when no file uploaded', async () => {
      const req = { ...baseReq, file: undefined };

      await uploadDeliverable(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates deliverable and notifies supervisor', async () => {
      const req = {
        ...baseReq,
        file: { filename: 'file.pdf', originalname: 'rapport.pdf', size: 1024 },
      };
      const newDeliverable = { _id: 'dId', titre: 'Rapport Final' };
      Deliverable.create = jest.fn().mockResolvedValue(newDeliverable);
      Project.findById = jest.fn().mockReturnValue(chain({ _id: 'projId', encadrantId: 'supId' }));

      await uploadDeliverable(req, res);

      expect(Deliverable.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'projId', fichierURL: '/uploads/file.pdf' }),
      );
      expect(createNotification).toHaveBeenCalledWith('supId', expect.any(String), 'info', expect.any(String));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('skips notification when project not found', async () => {
      const req = {
        ...baseReq,
        file: { filename: 'file.pdf', originalname: 'rapport.pdf', size: 512 },
      };
      Deliverable.create = jest.fn().mockResolvedValue({ _id: 'dId', titre: 'T' });
      Project.findById = jest.fn().mockReturnValue(chain(null));

      await uploadDeliverable(req, res);

      expect(createNotification).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 on error', async () => {
      const req = {
        ...baseReq,
        file: { filename: 'f.pdf', originalname: 'f.pdf', size: 100 },
      };
      Deliverable.create = jest.fn().mockRejectedValue(new Error('Validation error'));

      await uploadDeliverable(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── deleteDeliverable ────────────────────────────────────────────────────

  describe('deleteDeliverable', () => {
    it('returns 404 when deliverable not found', async () => {
      const req = { params: { id: 'dId' } };
      Deliverable.findByIdAndDelete = jest.fn().mockReturnValue(chain(null));

      await deleteDeliverable(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes deliverable successfully', async () => {
      const req = { params: { id: 'dId' } };
      Deliverable.findByIdAndDelete = jest.fn().mockReturnValue(chain({ _id: 'dId' }));

      await deleteDeliverable(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'dId' } };
      Deliverable.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await deleteDeliverable(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});