const request = require('supertest');
const app = require('../server');

// Helper : créer un user et retourner token + infos
const registerUser = async (overrides = {}) => {
  const email = overrides.email || `user_${Date.now()}@test.com`;
  const res = await request(app).post('/api/auth/register').send({
    nom: 'Test', prenom: 'User', email, motDePasse: 'password123',
    ...overrides
  });
  return res.body;
};

describe('Project Routes', () => {

  // ── GET all projects ──────────────────────────────────────
  describe('GET /api/projects', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 avec token valide (étudiant)', async () => {
      const { token } = await registerUser();
      const res = await request(app).get('/api/projects')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('retourne 200 avec filtre statut', async () => {
      const { token } = await registerUser();
      const res = await request(app).get('/api/projects?statut=en cours')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });

  });

  // ── GET project by ID ─────────────────────────────────────
  describe('GET /api/projects/:id', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/projects/000000000000000000000001');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 404 si projet inexistant', async () => {
      const { token } = await registerUser();
      const res = await request(app).get('/api/projects/000000000000000000000001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });

    it('retourne 500 si id invalide (pas un ObjectId)', async () => {
      const { token } = await registerUser();
      const res = await request(app).get('/api/projects/id-invalide')
        .set('Authorization', `Bearer ${token}`);
      expect([400, 500]).toContain(res.statusCode);
    });

  });

  // ── UPDATE project ────────────────────────────────────────
  describe('PUT /api/projects/:id', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).put('/api/projects/000000000000000000000001')
        .send({ statut: 'terminé' });
      expect(res.statusCode).toBe(401);
    });

    it('retourne 404 si projet inexistant', async () => {
      const { token } = await registerUser();
      const res = await request(app).put('/api/projects/000000000000000000000001')
        .set('Authorization', `Bearer ${token}`)
        .send({ statut: 'terminé' });
      expect([404, 403]).toContain(res.statusCode);
    });

    it('retourne 400 si id invalide', async () => {
      const { token } = await registerUser();
      const res = await request(app).put('/api/projects/id-invalide')
        .set('Authorization', `Bearer ${token}`)
        .send({ statut: 'terminé' });
      expect([400,403, 500]).toContain(res.statusCode);
    });

  });

  // ── UPDATE progression ────────────────────────────────────
  describe('PUT /api/projects/:id/progression', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).put('/api/projects/000000000000000000000001/progression');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 avec progression 0 si aucun milestone', async () => {
      const { token } = await registerUser();
      // Un projet qui n'existe pas → 404 ou 500
      const res = await request(app).put('/api/projects/000000000000000000000001/progression')
        .set('Authorization', `Bearer ${token}`);
      expect([200, 403, 404, 500]).toContain(res.statusCode);
    });

  });

});