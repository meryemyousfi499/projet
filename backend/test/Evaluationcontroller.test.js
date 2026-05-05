jest.mock('../models/Evaluation');
jest.mock('../models/Project');
jest.mock('../utils/notifications');

const Evaluation = require('../models/Evaluation');
const Project    = require('../models/Project');
const { createNotification } = require('../utils/notifications');

const {
  getEvaluation,
  createOrUpdateEvaluation,
} = require('../controllers/evaluationController');

const { chain, mockRes } = require('./helpers');

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('evaluationController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
    jest.clearAllMocks(); // Reset all mock call counts and instances between tests
    createNotification.mockResolvedValue(true);
  });

  // ─── getEvaluation ────────────────────────────────────────────────────────

  describe('getEvaluation', () => {
    it('returns evaluation for a project', async () => {
      const req = { params: { projectId: 'projId' } };
      const eval_ = { _id: 'evId', noteFinale: 15 };
      Evaluation.findOne = jest.fn().mockReturnValue(chain(eval_));

      await getEvaluation(req, res);

      expect(Evaluation.findOne).toHaveBeenCalledWith({ projectId: 'projId' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: eval_ });
    });

    it('returns null data when no evaluation exists', async () => {
      const req = { params: { projectId: 'projId' } };
      Evaluation.findOne = jest.fn().mockReturnValue(chain(null));

      await getEvaluation(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    });

    it('returns 500 on error', async () => {
      const req = { params: { projectId: 'projId' } };
      Evaluation.findOne = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnThis(), exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getEvaluation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── createOrUpdateEvaluation ─────────────────────────────────────────────

  describe('createOrUpdateEvaluation', () => {
    const baseReq = {
      params: { projectId: 'projId' },
      body: { noteEncadrant: 14, noteJury: 16, commentaireEncadrant: 'Bien', commentaireJury: 'Très bien' },
      user: { id: 'supId' },
    };

    it('creates a new evaluation when none exists', async () => {
      Evaluation.findOne = jest.fn().mockReturnValue(chain(null));
      const newEval = { _id: 'evId', noteFinale: 15 };
      Evaluation.create = jest.fn().mockResolvedValue(newEval);
      Project.findById = jest.fn().mockReturnValue(chain({ etudiants: [] }));

      await createOrUpdateEvaluation(baseReq, res);

      expect(Evaluation.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'projId', noteEncadrant: 14, evaluateurId: 'supId' }),
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('updates existing evaluation', async () => {
      const existingEval = {
        _id: 'evId',
        noteEncadrant: 10,
        noteJury: 12,
        commentaireEncadrant: 'Moyen',
        commentaireJury: '',
        noteFinale: 11,
        evaluateurId: null,
        save: jest.fn().mockResolvedValue(true),
      };
      Evaluation.findOne = jest.fn().mockReturnValue(chain(existingEval));
      Project.findById = jest.fn().mockReturnValue(chain({ etudiants: [{ _id: 'stu1' }] }));

      await createOrUpdateEvaluation(baseReq, res);

      expect(existingEval.noteEncadrant).toBe(14);
      expect(existingEval.evaluateurId).toBe('supId');
      expect(existingEval.save).toHaveBeenCalled();
    });

    it('notifies students when noteFinale is set', async () => {
      const existingEval = {
        noteEncadrant: 14,
        noteJury: 16,
        commentaireEncadrant: '',
        commentaireJury: '',
        noteFinale: 15,
        evaluateurId: null,
        save: jest.fn().mockResolvedValue(true),
      };
      Evaluation.findOne = jest.fn().mockReturnValue(chain(existingEval));
      Project.findById = jest.fn().mockReturnValue(
        chain({ etudiants: [{ _id: 'stu1' }, { _id: 'stu2' }] }),
      );

      await createOrUpdateEvaluation(baseReq, res);

      expect(createNotification).toHaveBeenCalledTimes(2);
      expect(createNotification).toHaveBeenCalledWith('stu1', expect.stringContaining('15'), 'success');
    });

    it('does not notify when noteFinale is null', async () => {
      const existingEval = {
        noteEncadrant: 14,
        noteJury: null,
        commentaireEncadrant: '',
        commentaireJury: '',
        noteFinale: null,
        evaluateurId: null,
        save: jest.fn().mockResolvedValue(true),
      };
      Evaluation.findOne = jest.fn().mockReturnValue(chain(existingEval));
      Project.findById = jest.fn().mockReturnValue(chain({ etudiants: [{ _id: 'stu1' }] }));

      await createOrUpdateEvaluation(baseReq, res);

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('returns 400 on error', async () => {
      Evaluation.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await createOrUpdateEvaluation(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});