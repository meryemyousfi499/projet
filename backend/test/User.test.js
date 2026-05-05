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

const fakeId = '000000000000000000000001';

describe('User Routes', () => {

  describe('GET /api/users/supervisors', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/users/supervisors');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/users/supervisors').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne liste des superviseurs actifs', async () => {
      await createUser('ROLE_SUPERVISOR');
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/users/supervisors').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/users', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 avec token admin', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBeDefined();
    });
    it('retourne 200 avec filtre role', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/users?role=ROLE_STUDENT').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec filtre search', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/users?search=test').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec filtre statut', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/users?statut=actif').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec filtre departement', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/users?departement=Info').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec pagination', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/users?page=1&limit=5').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/users/:id', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get(`/api/users/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 404 si user inexistant', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get(`/api/users/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 avec id valide', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const { user } = await createUser('ROLE_STUDENT');
      const res = await request(app).get(`/api/users/${user._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(user._id.toString());
    });
  });

  describe('POST /api/users', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
        .send({ nom: 'X', prenom: 'Y', email: `x_${Date.now()}@test.com`, motDePasse: 'pass123' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 201 avec token admin', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
        .send({ nom: 'New', prenom: 'User', email: `new_${Date.now()}@test.com`, motDePasse: 'pass123', role: 'ROLE_STUDENT' });
      expect(res.statusCode).toBe(201);
    });
    it('retourne 400 si email duplique', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const email = `dup_${Date.now()}@test.com`;
      await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
        .send({ nom: 'A', prenom: 'B', email, motDePasse: 'pass123' });
      const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
        .send({ nom: 'A', prenom: 'B', email, motDePasse: 'pass123' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).put(`/api/users/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ nom: 'X' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 404 si user inexistant', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).put(`/api/users/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ nom: 'X' });
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si mise a jour reussie', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const { user } = await createUser('ROLE_STUDENT');
      const res = await request(app).put(`/api/users/${user._id}`).set('Authorization', `Bearer ${token}`).send({ nom: 'Modifie' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.nom).toBe('Modifie');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete(`/api/users/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 404 si user inexistant', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).delete(`/api/users/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si suppression reussie', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const { user } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete(`/api/users/${user._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PATCH /api/users/:id/toggle-status', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).patch(`/api/users/${fakeId}/toggle-status`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 404 si user inexistant', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).patch(`/api/users/${fakeId}/toggle-status`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 et passe inactif', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const { user } = await createUser('ROLE_STUDENT');
      const res = await request(app).patch(`/api/users/${user._id}/toggle-status`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.statut).toBe('inactif');
    });
    it('retourne 200 et repasse actif', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const { user } = await createUser('ROLE_STUDENT');
      await request(app).patch(`/api/users/${user._id}/toggle-status`).set('Authorization', `Bearer ${token}`);
      const res = await request(app).patch(`/api/users/${user._id}/toggle-status`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.statut).toBe('actif');
    });
  });

});