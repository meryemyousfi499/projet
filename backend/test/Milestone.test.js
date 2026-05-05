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
  const subject = await Subject.create({ titre: 'Sujet Test', description: 'Desc', encadrantId: supervisorId, statut: 'validé' });
  return await Project.create({ sujetId: subject._id, encadrantId: supervisorId, etudiants: [studentId] });
};

const createMilestone = async (projectId) => {
  const Milestone = require('../models/Milestone');
  return await Milestone.create({ projectId, nomEtape: 'Etape Test', ordre: 1 });
};

const fakeId = '000000000000000000000001';

describe('Milestone Routes', () => {

  describe('GET /api/milestones/project/:projectId', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get(`/api/milestones/project/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 liste vide si aucun milestone', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get(`/api/milestones/project/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });
    it('retourne 200 avec milestones existants', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      await createMilestone(project._id);
      const res = await request(app).get(`/api/milestones/project/${project._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/milestones/project/:projectId', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post(`/api/milestones/project/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ nomEtape: 'Etape 1' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 201 avec token superviseur', async () => {
      const { user: student } = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const res = await request(app).post(`/api/milestones/project/${project._id}`).set('Authorization', `Bearer ${token}`).send({ nomEtape: 'Nouvelle etape', ordre: 1 });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.nomEtape).toBe('Nouvelle etape');
    });
  });

  describe('PUT /api/milestones/:id', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).put(`/api/milestones/${fakeId}`).send({ statut: 'terminé' });
      expect(res.statusCode).toBe(401);
    });
    it('retourne 404 si milestone inexistant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).put(`/api/milestones/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ statut: 'terminé' });
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si mise a jour reussie', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const milestone = await createMilestone(project._id);
      const res = await request(app).put(`/api/milestones/${milestone._id}`).set('Authorization', `Bearer ${token}`).send({ statut: 'terminé' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.statut).toBe('terminé');
    });
  });

  describe('DELETE /api/milestones/:id', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete(`/api/milestones/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 404 si milestone inexistant', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).delete(`/api/milestones/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si suppression reussie', async () => {
      const { user: student } = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const milestone = await createMilestone(project._id);
      const res = await request(app).delete(`/api/milestones/${milestone._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

});