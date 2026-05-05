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

const createGroup = async (chefUser) => {
  const Group = require('../models/Group');
  return await Group.create({ nom: `Groupe_${Date.now()}`, chef: chefUser._id, membres: [chefUser._id] });
};

const fakeId = '000000000000000000000001';

describe('Group Routes', () => {

  describe('GET /api/groups/my', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/groups/my');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 avec data null si pas de groupe', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/groups/my').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec le groupe si existant', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      await createGroup(user);
      const res = await request(app).get('/api/groups/my').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeTruthy();
    });
  });

  describe('GET /api/groups/invitations', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/groups/invitations');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 200 avec liste vide', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/groups/invitations').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/groups (admin/supervisor)', () => {
    it('retourne 403 avec token etudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });
    it('retourne 200 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
    it('retourne 200 avec token admin', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/groups (creer groupe)', () => {
    it('retourne 403 avec token superviseur', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({ nom: 'Groupe X' });
      expect(res.statusCode).toBe(403);
    });
    it('retourne 201 si creation reussie', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({ nom: `Groupe_${Date.now()}` });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.nom).toBeDefined();
    });
    it('retourne 400 si deja dans un groupe', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      await createGroup(user);
      const res = await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({ nom: 'Second groupe' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/groups/invite', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).post('/api/groups/invite').send({ email: 'x@test.com' });
      expect(res.statusCode).toBe(401);
    });
    it('retourne 404 si pas chef', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post('/api/groups/invite').set('Authorization', `Bearer ${token}`).send({ email: 'x@test.com' });
      expect(res.statusCode).toBe(404);
    });
    it('retourne 404 si email inconnu', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      await createGroup(user);
      const res = await request(app).post('/api/groups/invite').set('Authorization', `Bearer ${token}`).send({ email: 'inconnu@test.com' });
      expect(res.statusCode).toBe(404);
    });
    it('retourne 400 si membre deja dans groupe', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      const { user: target } = await createUser('ROLE_STUDENT');
      await createGroup(user);
      const Group = require('../models/Group');
      await Group.findOneAndUpdate({ chef: user._id }, { $push: { membres: target._id } });
      const res = await request(app).post('/api/groups/invite').set('Authorization', `Bearer ${token}`).send({ email: target.email });
      expect(res.statusCode).toBe(400);
    });
    it('retourne 200 si invitation envoyee', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      const { user: target } = await createUser('ROLE_STUDENT');
      await createGroup(user);
      const res = await request(app).post('/api/groups/invite').set('Authorization', `Bearer ${token}`).send({ email: target.email });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/groups/:id/respond', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).post(`/api/groups/${fakeId}/respond`).send({ statut: 'accepte' });
      expect(res.statusCode).toBe(401);
    });
    it('retourne 404 si groupe inexistant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).post(`/api/groups/${fakeId}/respond`).set('Authorization', `Bearer ${token}`).send({ statut: 'accepté' });
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si accepte invitation', async () => {
      const { user: chef } = await createUser('ROLE_STUDENT');
      const { user: invited, token } = await createUser('ROLE_STUDENT');
      const group = await createGroup(chef);
      const Group = require('../models/Group');
      await Group.findByIdAndUpdate(group._id, { $push: { invitations: { userId: invited._id } } });
      const res = await request(app).post(`/api/groups/${group._id}/respond`).set('Authorization', `Bearer ${token}`).send({ statut: 'accepté' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/groups/leave', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).delete('/api/groups/leave');
      expect(res.statusCode).toBe(401);
    });
    it('retourne 404 si pas dans un groupe', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete('/api/groups/leave').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 400 si chef essaie de quitter', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      await createGroup(user);
      const res = await request(app).delete('/api/groups/leave').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(400);
    });
    it('retourne 200 si membre quitte', async () => {
      const { user: chef } = await createUser('ROLE_STUDENT');
      const { user: member, token } = await createUser('ROLE_STUDENT');
      const Group = require('../models/Group');
      await Group.create({ nom: 'Groupe', chef: chef._id, membres: [chef._id, member._id] });
      const res = await request(app).delete('/api/groups/leave').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/groups (supprimer)', () => {
    it('retourne 404 si pas chef', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete('/api/groups').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si chef supprime', async () => {
      const { user, token } = await createUser('ROLE_STUDENT');
      await createGroup(user);
      const res = await request(app).delete('/api/groups').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/groups/members/:userId', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).delete(`/api/groups/members/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });
    it('retourne 404 si pas chef', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).delete(`/api/groups/members/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
    it('retourne 200 si membre retire', async () => {
      const { user: chef, token } = await createUser('ROLE_STUDENT');
      const { user: member } = await createUser('ROLE_STUDENT');
      const Group = require('../models/Group');
      await Group.create({ nom: 'Groupe', chef: chef._id, membres: [chef._id, member._id] });
      const res = await request(app).delete(`/api/groups/members/${member._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

});