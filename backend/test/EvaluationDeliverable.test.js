const request = require('supertest');
const app = require('../server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createUser = async (role = 'ROLE_STUDENT', overrides = {}) => {
  const User = require('../models/User');
  const email = overrides.email || `${role}_${Date.now()}_${Math.random().toString(36).substr(2,5)}@test.com`;
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash('password123', salt);
  const user = await User.create({ nom: 'Test', prenom: role, email, motDePasse: hash, role, statut: 'actif', ...overrides });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '7d' });
  return { user, token };
};

const createProject = async (studentId, supervisorId) => {
  const Subject = require('../models/Subject');
  const Project = require('../models/Project');
  const subject = await Subject.create({ titre: 'Sujet', description: 'Desc', encadrantId: supervisorId, statut: 'validé' });
  return await Project.create({ sujetId: subject._id, encadrantId: supervisorId, etudiants: [studentId] });
};

const fakeId = '000000000000000000000001';

describe('Evaluation Routes', () => {

  describe('GET /api/evaluations/project/:projectId', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get(`/api/evaluations/project/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 avec data null si pas devaluation', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get(`/api/evaluations/project/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeNull();
    });
    it('retourne 200 avec evaluation existante', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const Evaluation = require('../models/Evaluation');
      await Evaluation.create({ projectId: project._id, noteEncadrant: 15, evaluateurId: supervisor._id });
      const res = await request(app).get(`/api/evaluations/project/${project._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.noteEncadrant).toBe(15);
    });
  });

  describe('POST /api/evaluations/project/:projectId', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post(`/api/evaluations/project/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ noteEncadrant: 14 });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 creation evaluation (superviseur)', async () => {
      const { user: student } = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const res = await request(app).post(`/api/evaluations/project/${project._id}`).set('Authorization', `Bearer ${token}`).send({ noteEncadrant: 14, commentaireEncadrant: 'Bien' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.noteEncadrant).toBe(14);
    });
    it('retourne 200 mise a jour evaluation existante', async () => {
      const { user: student } = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const Evaluation = require('../models/Evaluation');
      await Evaluation.create({ projectId: project._id, noteEncadrant: 12, evaluateurId: supervisor._id });
      const res = await request(app).post(`/api/evaluations/project/${project._id}`).set('Authorization', `Bearer ${token}`).send({ noteEncadrant: 16, noteJury: 18 });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.noteEncadrant).toBe(16);
    });
  });

});

describe('Deliverable Routes', () => {

  describe('GET /api/deliverables/project/:projectId', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get(`/api/deliverables/project/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 avec liste vide', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get(`/api/deliverables/project/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/deliverables/:id', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).delete(`/api/deliverables/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });
    it('retourne 404 si livrable inexistant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete(`/api/deliverables/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si suppression reussie', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const Deliverable = require('../models/Deliverable');
      const deliverable = await Deliverable.create({ projectId: project._id, type: 'rapport', titre: 'Rapport', fichierURL: '/uploads/test.pdf', uploadePar: student._id });
      const res = await request(app).delete(`/api/deliverables/${deliverable._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

});