jest.mock('../models/Project');
jest.mock('../models/Milestone');
jest.mock('../models/Group');

const Project   = require('../models/Project');
const Milestone = require('../models/Milestone');
const Group     = require('../models/Group');

const {
  getProjects,
  getProjectById,
  updateProject,
  updateProgression,
} = require('../controllers/projectController');

const { chain, mockRes } = require('./helpers');

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('projectController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
  });

  // ─── getProjects ──────────────────────────────────────────────────────────

  describe('getProjects', () => {
    it('returns projects for student (no group)', async () => {
      const req = { user: { id: 'stuId', role: 'ROLE_STUDENT' }, query: {} };
      Group.findOne = jest.fn().mockReturnValue(chain(null));
      Project.find = jest.fn().mockReturnValue(chain([]));

      await getProjects(req, res);

      expect(Project.find).toHaveBeenCalledWith(expect.objectContaining({ etudiants: 'stuId' }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('queries by $or when student has a group', async () => {
      const req = { user: { id: 'stuId', role: 'ROLE_STUDENT' }, query: {} };
      Group.findOne = jest.fn().mockReturnValue(chain({ _id: 'gId' }));
      Project.find = jest.fn().mockReturnValue(chain([]));

      await getProjects(req, res);

      expect(Project.find).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
    });

    it('filters by encadrantId for supervisor', async () => {
      const req = { user: { id: 'supId', role: 'ROLE_SUPERVISOR' }, query: {} };
      Project.find = jest.fn().mockReturnValue(chain([]));

      await getProjects(req, res);

      expect(Project.find).toHaveBeenCalledWith(expect.objectContaining({ encadrantId: 'supId' }));
    });

    it('applies statut filter from query params', async () => {
      const req = { user: { id: 'adminId', role: 'ROLE_ADMIN' }, query: { statut: 'terminé' } };
      Project.find = jest.fn().mockReturnValue(chain([]));

      await getProjects(req, res);

      expect(Project.find).toHaveBeenCalledWith(expect.objectContaining({ statut: 'terminé' }));
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'adminId', role: 'ROLE_ADMIN' }, query: {} };
      Project.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('fail')),
      });

      await getProjects(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getProjectById ───────────────────────────────────────────────────────

  describe('getProjectById', () => {
    it('returns project by ID', async () => {
      const req = { params: { id: 'projId' } };
      const project = { _id: 'projId', titre: 'PFE' };
      Project.findById = jest.fn().mockReturnValue(chain(project));

      await getProjectById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: project }));
    });

    it('returns 404 when project not found', async () => {
      const req = { params: { id: 'projId' } };
      Project.findById = jest.fn().mockReturnValue(chain(null));

      await getProjectById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'projId' } };
      Project.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('fail')),
      });

      await getProjectById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateProject ────────────────────────────────────────────────────────

  describe('updateProject', () => {
    it('returns 404 when project not found', async () => {
      const req = { params: { id: 'projId' }, body: { statut: 'terminé' } };
      Project.findByIdAndUpdate = jest.fn().mockReturnValue(chain(null));

      await updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates and returns project', async () => {
      const req = { params: { id: 'projId' }, body: { statut: 'terminé' } };
      const updatedProject = { _id: 'projId', statut: 'terminé' };
      Project.findByIdAndUpdate = jest.fn().mockReturnValue(chain(updatedProject));

      await updateProject(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updatedProject }));
    });

    it('returns 400 on error', async () => {
      const req = { params: { id: 'projId' }, body: {} };
      Project.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('Validation error')) });

      await updateProject(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── updateProgression ────────────────────────────────────────────────────

  describe('updateProgression', () => {
    it('computes and saves correct progression', async () => {
      const req = { params: { id: 'projId' } };
      Milestone.find = jest.fn().mockReturnValue(
        chain([{ statut: 'terminé' }, { statut: 'terminé' }, { statut: 'en cours' }]),
      );
      const updatedProject = { _id: 'projId', progression: 67 };
      Project.findByIdAndUpdate = jest.fn().mockReturnValue(chain(updatedProject));

      await updateProgression(req, res);

      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith('projId', { progression: 67 }, { new: true });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ progression: 67 }) }),
      );
    });

    it('sets progression to 0 when no milestones', async () => {
      const req = { params: { id: 'projId' } };
      Milestone.find = jest.fn().mockReturnValue(chain([]));
      Project.findByIdAndUpdate = jest.fn().mockReturnValue(chain({ progression: 0 }));

      await updateProgression(req, res);

      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith('projId', { progression: 0 }, { new: true });
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'projId' } };
      Milestone.find = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await updateProgression(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});