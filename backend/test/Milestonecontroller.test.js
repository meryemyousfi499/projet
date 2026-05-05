jest.mock('../models/Milestone');
jest.mock('../models/Project');

const Milestone = require('../models/Milestone');
const Project   = require('../models/Project');

const {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} = require('../controllers/milestoneController');

const { chain, mockRes } = require('./helpers');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupRecalcMocks = (milestones = []) => {
  Milestone.find = jest.fn().mockReturnValue(chain(milestones));
  Project.findByIdAndUpdate = jest.fn().mockReturnValue(chain({}));
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('milestoneController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
  });

  // ─── getMilestones ────────────────────────────────────────────────────────

  describe('getMilestones', () => {
    it('returns milestones sorted by order', async () => {
      const req = { params: { projectId: 'projId' } };
      const milestones = [{ _id: 'm1', nomEtape: 'Cahier des charges', ordre: 1 }];
      Milestone.find = jest.fn().mockReturnValue(chain(milestones));

      await getMilestones(req, res);

      expect(Milestone.find).toHaveBeenCalledWith({ projectId: 'projId' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: milestones });
    });

    it('returns 500 on error', async () => {
      const req = { params: { projectId: 'projId' } };
      Milestone.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getMilestones(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── createMilestone ──────────────────────────────────────────────────────

  describe('createMilestone', () => {
    it('creates milestone and recalculates progression', async () => {
      const req = {
        params: { projectId: 'projId' },
        body: { nomEtape: 'Soutenance', ordre: 5 },
      };
      const newMilestone = { _id: 'm5', nomEtape: 'Soutenance', projectId: 'projId' };
      Milestone.create = jest.fn().mockResolvedValue(newMilestone);
      setupRecalcMocks([{ statut: 'terminé' }, { statut: 'en cours' }]);

      await createMilestone(req, res);

      expect(Milestone.create).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'projId' }));
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith('projId', { progression: 50 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('sets progression to 0 when no milestones exist', async () => {
      const req = { params: { projectId: 'projId' }, body: { nomEtape: 'Init', ordre: 1 } };
      Milestone.create = jest.fn().mockResolvedValue({ _id: 'm1', projectId: 'projId' });
      setupRecalcMocks([]);

      await createMilestone(req, res);

      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith('projId', { progression: 0 });
    });

    it('returns 400 on error', async () => {
      const req = { params: { projectId: 'projId' }, body: {} };
      Milestone.create = jest.fn().mockRejectedValue(new Error('Validation error'));

      await createMilestone(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── updateMilestone ──────────────────────────────────────────────────────

  describe('updateMilestone', () => {
    it('returns 404 when milestone not found', async () => {
      const req = { params: { id: 'mId' }, body: { statut: 'terminé' } };
      Milestone.findByIdAndUpdate = jest.fn().mockReturnValue(chain(null));

      await updateMilestone(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates milestone and recalculates project progression', async () => {
      const req = { params: { id: 'mId' }, body: { statut: 'terminé' } };
      const updatedMilestone = { _id: 'mId', statut: 'terminé', projectId: 'projId' };
      Milestone.findByIdAndUpdate = jest.fn().mockReturnValue(chain(updatedMilestone));
      setupRecalcMocks([{ statut: 'terminé' }, { statut: 'terminé' }, { statut: 'en cours' }]);

      await updateMilestone(req, res);

      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith('projId', { progression: 67 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 100% progression when all milestones are done', async () => {
      const req = { params: { id: 'mId' }, body: { statut: 'terminé' } };
      Milestone.findByIdAndUpdate = jest.fn().mockReturnValue(chain({ _id: 'mId', projectId: 'projId' }));
      setupRecalcMocks([{ statut: 'terminé' }, { statut: 'terminé' }]);

      await updateMilestone(req, res);

      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith('projId', { progression: 100 });
    });
  });

  // ─── deleteMilestone ──────────────────────────────────────────────────────

  describe('deleteMilestone', () => {
    it('returns 404 when milestone not found', async () => {
      const req = { params: { id: 'mId' } };
      Milestone.findByIdAndDelete = jest.fn().mockReturnValue(chain(null));

      await deleteMilestone(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes milestone and recalculates progression', async () => {
      const req = { params: { id: 'mId' } };
      Milestone.findByIdAndDelete = jest.fn().mockReturnValue(chain({ _id: 'mId', projectId: 'projId' }));
      setupRecalcMocks([{ statut: 'terminé' }]);

      await deleteMilestone(req, res);

      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith('projId', { progression: 100 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'mId' } };
      Milestone.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await deleteMilestone(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});