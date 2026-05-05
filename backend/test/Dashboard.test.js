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

describe('Dashboard Routes', () => {

  describe('GET /api/dashboard/admin', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/dashboard/admin');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/dashboard/admin').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 403 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).get('/api/dashboard/admin').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 avec token admin', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/dashboard/admin').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalUsers).toBeDefined();
    });
  });

  describe('GET /api/dashboard/supervisor', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/dashboard/supervisor');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/dashboard/supervisor').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).get('/api/dashboard/supervisor').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.mySubjects).toBeDefined();
    });
  });

  describe('GET /api/dashboard/student', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/dashboard/student');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 403 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).get('/api/dashboard/student').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 avec token etudiant sans groupe', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/dashboard/student').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.myApplications).toBe(0);
    });
    it('retourne 200 avec token etudiant avec groupe', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      const Group = require('../models/Group');
      await Group.create({ nom: 'Groupe', chef: user._id, membres: [user._id] });
      const res = await request(app).get('/api/dashboard/student').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

});