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

describe('Message Routes', () => {

  describe('GET /api/messages/unread-counts', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/messages/unread-counts');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 avec token etudiant sans projet', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/messages/unread-counts').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.total).toBe(0);
    });
    it('retourne 200 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).get('/api/messages/unread-counts').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec token etudiant avec groupe', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      const Group = require('../models/Group');
      await Group.create({ nom: 'Groupe', chef: user._id, membres: [user._id] });
      const res = await request(app).get('/api/messages/unread-counts').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/messages/:projectId', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get(`/api/messages/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });
    it('retourne 403 si pas acces au projet', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get(`/api/messages/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 si etudiant du projet', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const res = await request(app).get(`/api/messages/${project._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    it('retourne 200 si superviseur du projet', async () => {
      const { user: student } = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const res = await request(app).get(`/api/messages/${project._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/messages/:projectId', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).post(`/api/messages/${fakeId}`).send({ content: 'Bonjour' });
      expect(res.statusCode).toBe(401);
    });
    it('retourne 403 si pas acces', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post(`/api/messages/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ content: 'Bonjour' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 400 si message vide', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const res = await request(app).post(`/api/messages/${project._id}`).set('Authorization', `Bearer ${token}`).send({ content: '' });
      expect(res.statusCode).toBe(400);
    });
    it('retourne 201 si message valide (etudiant)', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const res = await request(app).post(`/api/messages/${project._id}`).set('Authorization', `Bearer ${token}`).send({ content: 'Bonjour superviseur' });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.content).toBe('Bonjour superviseur');
    });
    it('retourne 201 si message valide (superviseur)', async () => {
      const { user: student } = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const project = await createProject(student._id, supervisor._id);
      const res = await request(app).post(`/api/messages/${project._id}`).set('Authorization', `Bearer ${token}`).send({ content: 'Bonjour etudiant' });
      expect(res.statusCode).toBe(201);
    });
  });

});