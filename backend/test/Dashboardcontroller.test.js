jest.mock('../models/User');
jest.mock('../models/Subject');
jest.mock('../models/Project');
jest.mock('../models/Application');
jest.mock('../models/Evaluation');
jest.mock('../models/Group');

const User        = require('../models/User');
const Subject     = require('../models/Subject');
const Project     = require('../models/Project');
const Application = require('../models/Application');
const Evaluation  = require('../models/Evaluation');
const Group       = require('../models/Group');

const {
  getAdminDashboard,
  getSupervisorDashboard,
  getStudentDashboard,
} = require('../controllers/dashboardController');

const { chain, mockRes } = require('./helpers');

// chain() étendu pour supporter .populate().sort().limit().exec()
const chainFull = (value) => ({
  populate: jest.fn().mockReturnThis(),
  select:   jest.fn().mockReturnThis(),
  sort:     jest.fn().mockReturnThis(),
  limit:    jest.fn().mockReturnThis(),
  exec:     jest.fn().mockResolvedValue(value),
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('dashboardController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
    jest.clearAllMocks();
  });

  // ─── getAdminDashboard ────────────────────────────────────────────────────

  describe('getAdminDashboard', () => {
    beforeEach(() => {
      User.countDocuments    = jest.fn().mockReturnValue(chain(10));
      Subject.countDocuments = jest.fn().mockReturnValue(chain(5));
      Project.countDocuments = jest.fn().mockReturnValue(chain(3));
      Application.countDocuments = jest.fn().mockReturnValue(chain(2));
      User.aggregate  = jest.fn().mockReturnValue(chain([{ _id: 'INFO', count: 4 }]));
      Project.find    = jest.fn().mockReturnValue(chainFull([]));
      Evaluation.find = jest.fn().mockReturnValue(chain([]));
    });

    it('returns all admin stats successfully', async () => {
      const req = { user: { id: 'adminId' } };

      await getAdminDashboard(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalUsers: 10,
            totalSubjects: 5,
            totalProjects: 3,
          }),
        }),
      );
    });

    it('computes average grade of 0 when no evaluations exist', async () => {
      Evaluation.find = jest.fn().mockReturnValue(chain([]));
      const req = { user: { id: 'adminId' } };

      await getAdminDashboard(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.data.avgGrade).toBe(0);
    });

    it('computes average grade correctly when evaluations exist', async () => {
      Evaluation.find = jest.fn().mockReturnValue(
        chain([{ noteFinale: 14 }, { noteFinale: 16 }]),
      );
      const req = { user: { id: 'adminId' } };

      await getAdminDashboard(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.data.avgGrade).toBe('15.00');
    });

    it('returns 500 on error', async () => {
      User.countDocuments = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB error')) });
      const req = { user: { id: 'adminId' } };

      await getAdminDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getSupervisorDashboard ───────────────────────────────────────────────

  describe('getSupervisorDashboard', () => {
    it('returns supervisor stats', async () => {
      const req = { user: { id: 'supId' } };
      Subject.countDocuments = jest.fn().mockReturnValue(chain(4));
      Project.countDocuments = jest.fn().mockReturnValue(chain(2));
      // Subject.find().select('_id').exec() — nécessite le mock chainFull
      Subject.find = jest.fn().mockReturnValue(chainFull([{ _id: 's1' }]));
      Application.countDocuments = jest.fn().mockReturnValue(chain(1));
      Project.find = jest.fn().mockReturnValue(chainFull([]));

      await getSupervisorDashboard(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ mySubjects: 4, myProjects: 2 }),
        }),
      );
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'supId' } };
      Subject.countDocuments = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getSupervisorDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getStudentDashboard ──────────────────────────────────────────────────

  describe('getStudentDashboard', () => {
    it('returns 0 applications when student has no group', async () => {
      const req = { user: { id: 'stuId' } };
      Group.findOne   = jest.fn().mockReturnValue(chain(null));
      Project.findOne = jest.fn().mockReturnValue(chainFull(null));

      await getStudentDashboard(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.data.myApplications).toBe(0);
      expect(call.data.myProject).toBeNull();
    });

    it('returns project and evaluation when student has a project', async () => {
      const req = { user: { id: 'stuId' } };
      Group.findOne = jest.fn().mockReturnValue(chain({ _id: 'gId' }));
      Application.countDocuments = jest.fn().mockReturnValue(chain(3));
      const mockProject = { _id: 'projId', titre: 'PFE' };
      Project.findOne  = jest.fn().mockReturnValue(chainFull(mockProject));
      Evaluation.findOne = jest.fn().mockReturnValue(chain({ noteFinale: 15 }));

      await getStudentDashboard(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            myApplications: 3,
            myProject: mockProject,
            evaluation: expect.objectContaining({ noteFinale: 15 }),
          }),
        }),
      );
    });

    it('skips evaluation query when no project found', async () => {
      const req = { user: { id: 'stuId' } };
      Group.findOne = jest.fn().mockReturnValue(chain({ _id: 'gId' }));
      Application.countDocuments = jest.fn().mockReturnValue(chain(1));
      Project.findOne  = jest.fn().mockReturnValue(chainFull(null));
      Evaluation.findOne = jest.fn();

      await getStudentDashboard(req, res);

      expect(Evaluation.findOne).not.toHaveBeenCalled();
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'stuId' } };
      Group.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getStudentDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});