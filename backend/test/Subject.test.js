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

const createSubject = async (supervisorId, overrides = {}) => {
  const Subject = require('../models/Subject');
  return await Subject.create({ titre: `Sujet_${Date.now()}`, description: 'Description test', encadrantId: supervisorId, statut: 'proposé', ...overrides });
};

const fakeId = '000000000000000000000001';

describe('Subject Routes', () => {

  describe('GET /api/subjects', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/subjects');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 avec token valide', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/subjects').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBeDefined();
    });
    it('retourne 200 avec filtre statut', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/subjects?statut=validé').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec filtre search', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/subjects?search=test').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec filtre technology', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/subjects?technology=react').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/subjects/my-subjects', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/subjects/my-subjects').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 avec token superviseur', async () => {
      const { user, token } = await createUser('ROLE_SUPERVISOR');
      await createSubject(user._id);
      const res = await request(app).get('/api/subjects/my-subjects').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/subjects/:id', () => {
    it('retourne 404 si sujet inexistant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get(`/api/subjects/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 avec id valide', async () => {
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const { token } = await createUser('ROLE_STUDENT');
      const subject = await createSubject(supervisor._id);
      const res = await request(app).get(`/api/subjects/${subject._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.titre).toBeDefined();
    });
  });

  describe('POST /api/subjects', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post('/api/subjects').set('Authorization', `Bearer ${token}`).send({ titre: 'Sujet', description: 'Desc' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 201 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).post('/api/subjects').set('Authorization', `Bearer ${token}`).send({ titre: `Sujet_${Date.now()}`, description: 'Description valide' });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('PUT /api/subjects/:id', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).put(`/api/subjects/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ titre: 'X' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 404 si sujet inexistant', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).put(`/api/subjects/${fakeId}`).set('Authorization', `Bearer ${token}`).send({ titre: 'X' });
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si superviseur modifie son sujet', async () => {
      const { user, token } = await createUser('ROLE_SUPERVISOR');
      const subject = await createSubject(user._id);
      const res = await request(app).put(`/api/subjects/${subject._id}`).set('Authorization', `Bearer ${token}`).send({ titre: 'Titre modifie' });
      expect(res.statusCode).toBe(200);
    });
    it('retourne 403 si superviseur modifie sujet d un autre', async () => {
      const { user: other } = await createUser('ROLE_SUPERVISOR');
      const { token } = await createUser('ROLE_SUPERVISOR');
      const subject = await createSubject(other._id);
      const res = await request(app).put(`/api/subjects/${subject._id}`).set('Authorization', `Bearer ${token}`).send({ titre: 'X' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/subjects/:id/validate', () => {
    it('retourne 403 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).patch(`/api/subjects/${fakeId}/validate`).set('Authorization', `Bearer ${token}`).send({ statut: 'validé' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 avec token admin', async () => {
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const { token } = await createUser('ROLE_ADMIN');
      const subject = await createSubject(supervisor._id);
      const res = await request(app).patch(`/api/subjects/${subject._id}/validate`).set('Authorization', `Bearer ${token}`).send({ statut: 'validé' });
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec statut refusé', async () => {
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const { token } = await createUser('ROLE_ADMIN');
      const subject = await createSubject(supervisor._id);
      const res = await request(app).patch(`/api/subjects/${subject._id}/validate`).set('Authorization', `Bearer ${token}`).send({ statut: 'refusé', commentaireAdmin: 'Non conforme' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/subjects/:id', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete(`/api/subjects/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 404 si sujet inexistant', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).delete(`/api/subjects/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si suppression reussie', async () => {
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const { token } = await createUser('ROLE_ADMIN');
      const subject = await createSubject(supervisor._id);
      const res = await request(app).delete(`/api/subjects/${subject._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

});