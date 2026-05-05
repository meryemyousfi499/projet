const request = require('supertest');
const app     = require('../server');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const createUser = async (role = 'ROLE_STUDENT', overrides = {}) => {
  const User  = require('../models/User');
  const email = overrides.email || `${role}_${Date.now()}_${Math.random().toString(36).substr(2,5)}@test.com`;
  const salt  = await bcrypt.genSalt(12);
  const hash  = await bcrypt.hash('password123', salt);
  const user  = await User.create({
    nom: 'Test', prenom: role, email,
    motDePasse: hash, role, statut: 'actif', ...overrides
  });
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '7d' }
  );
  return { user, token };
};

const createSubject = async (supervisorId, statut = 'validé') => {
  const Subject = require('../models/Subject');
  return await Subject.create({
    titre:       `Sujet_${Date.now()}`,
    description: 'Description test',
    encadrantId: supervisorId,
    statut,
  });
};

const createGroup = async (chefUser, membres = []) => {
  const Group = require('../models/Group');
  return await Group.create({
    nom:     `Groupe_${Date.now()}`,
    chef:    chefUser._id,
    membres: [chefUser._id, ...membres.map(m => m._id)],
  });
};

const createApplication = async (groupId, sujetId, statut = 'en attente') => {
  const Application = require('../models/Application');
  return await Application.create({ groupId, sujetId, statut });
};

const fakeId = '000000000000000000000001';

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('Application Routes', () => {

  // ── GET /api/applications ─────────────────────────────────
  describe('GET /api/applications', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/applications');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 avec liste vide si étudiant sans groupe', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app).get('/api/applications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('retourne 200 avec candidatures si étudiant avec groupe', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor }     = await createUser('ROLE_SUPERVISOR');
      const subject = await createSubject(supervisor._id);
      const group   = await createGroup(student);
      await createApplication(group._id, subject._id);

      const res = await request(app).get('/api/applications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('retourne 200 pour un superviseur (toutes ses candidatures)', async () => {
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const { user: student }           = await createUser('ROLE_STUDENT');
      const subject = await createSubject(supervisor._id);
      const group   = await createGroup(student);
      await createApplication(group._id, subject._id);

      const res = await request(app).get('/api/applications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retourne 200 pour un admin', async () => {
      const { token } = await createUser('ROLE_ADMIN');
      const res = await request(app).get('/api/applications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });

    it('retourne 200 avec filtre statut', async () => {
      const { user: student, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor }     = await createUser('ROLE_SUPERVISOR');
      const subject = await createSubject(supervisor._id);
      const group   = await createGroup(student);
      await createApplication(group._id, subject._id, 'en attente');

      const res = await request(app).get('/api/applications?statut=en attente')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });

  });

  // ── POST /api/applications/subject/:subjectId ─────────────
  describe('POST /api/applications/subject/:subjectId', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).post(`/api/applications/subject/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });

    it('retourne 404 si sujet inexistant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app)
        .post(`/api/applications/subject/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ motivation: 'Motivé' });
      expect(res.statusCode).toBe(404);
    });

    it('retourne 400 si sujet non validé (statut proposé)', async () => {
      const { user: supervisor }    = await createUser('ROLE_SUPERVISOR');
      const { token }               = await createUser('ROLE_STUDENT');
      const subject = await createSubject(supervisor._id, 'proposé');

      const res = await request(app)
        .post(`/api/applications/subject/${subject._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ motivation: 'Motivé' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/disponible/i);
    });

    it('retourne 400 si étudiant sans groupe', async () => {
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const { token }            = await createUser('ROLE_STUDENT');
      const subject = await createSubject(supervisor._id, 'validé');

      const res = await request(app)
        .post(`/api/applications/subject/${subject._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ motivation: 'Motivé' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/groupe/i);
    });

    it('retourne 403 si étudiant membre mais pas chef du groupe', async () => {
      const { user: chef }       = await createUser('ROLE_STUDENT');
      const { user: member, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor } = await createUser('ROLE_SUPERVISOR');
      const subject = await createSubject(supervisor._id, 'validé');
      await createGroup(chef, [member]);

      const res = await request(app)
        .post(`/api/applications/subject/${subject._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ motivation: 'Motivé' });
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/chef/i);
    });

    it('retourne 400 si groupe a déjà postulé à ce sujet', async () => {
      const { user: chef, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor }  = await createUser('ROLE_SUPERVISOR');
      const subject = await createSubject(supervisor._id, 'validé');
      const group   = await createGroup(chef);
      await createApplication(group._id, subject._id);

      const res = await request(app)
        .post(`/api/applications/subject/${subject._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ motivation: 'Motivé' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/déjà postulé/i);
    });

    it('retourne 201 si candidature créée avec succès', async () => {
      const { user: chef, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor }  = await createUser('ROLE_SUPERVISOR');
      const subject = await createSubject(supervisor._id, 'validé');
      await createGroup(chef);

      const res = await request(app)
        .post(`/api/applications/subject/${subject._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ motivation: 'Je suis très motivé pour ce projet.' });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sujetId.toString()).toBe(subject._id.toString());
    });

  });

  // ── PUT /api/applications/:id ─────────────────────────────
  describe('PUT /api/applications/:id', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app)
        .put(`/api/applications/${fakeId}`)
        .send({ statut: 'accepté' });
      expect(res.statusCode).toBe(401);
    });

    it('retourne 403 avec token étudiant', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app)
        .put(`/api/applications/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statut: 'accepté' });
      expect(res.statusCode).toBe(403);
    });

    it('retourne 404 si candidature inexistante (superviseur)', async () => {
      const { token } = await createUser('ROLE_SUPERVISOR');
      const res = await request(app)
        .put(`/api/applications/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statut: 'refusé' });
      expect(res.statusCode).toBe(404);
    });

    it('retourne 200 avec statut refusé et notifications', async () => {
      const { user: chef }              = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const subject     = await createSubject(supervisor._id, 'validé');
      const group       = await createGroup(chef);
      const application = await createApplication(group._id, subject._id);

      const res = await request(app)
        .put(`/api/applications/${application._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statut: 'refusé', commentaireEncadrant: 'Dossier incomplet' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.statut).toBe('refusé');
    });

    it('retourne 200 avec statut accepté, crée projet et milestones', async () => {
      const { user: chef }              = await createUser('ROLE_STUDENT');
      const { user: supervisor, token } = await createUser('ROLE_SUPERVISOR');
      const subject     = await createSubject(supervisor._id, 'validé');
      const group       = await createGroup(chef);
      const application = await createApplication(group._id, subject._id);

      const res = await request(app)
        .put(`/api/applications/${application._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ statut: 'accepté', dateFin: '2025-12-31' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.statut).toBe('accepté');

      // Vérifier que le projet a bien été créé
      const Project = require('../models/Project');
      const project = await Project.findOne({ sujetId: subject._id });
      expect(project).not.toBeNull();

      // Vérifier que les milestones ont été créés
      const Milestone = require('../models/Milestone');
      const milestones = await Milestone.find({ projectId: project._id });
      expect(milestones.length).toBe(5);
    });

  });

  // ── DELETE /api/applications/:id ──────────────────────────
  describe('DELETE /api/applications/:id', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).delete(`/api/applications/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });

    it('retourne 403 si étudiant pas chef dun groupe', async () => {
      const { token } = await createUser('ROLE_STUDENT');
      const res = await request(app)
        .delete(`/api/applications/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(403);
    });

    it('retourne 404 si candidature introuvable (chef sans candidature)', async () => {
      const { user: chef, token } = await createUser('ROLE_STUDENT');
      await createGroup(chef);

      const res = await request(app)
        .delete(`/api/applications/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });

    it('retourne 200 si chef supprime sa candidature', async () => {
      const { user: chef, token } = await createUser('ROLE_STUDENT');
      const { user: supervisor }  = await createUser('ROLE_SUPERVISOR');
      const subject     = await createSubject(supervisor._id, 'validé');
      const group       = await createGroup(chef);
      const application = await createApplication(group._id, subject._id);

      const res = await request(app)
        .delete(`/api/applications/${application._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

  });

});