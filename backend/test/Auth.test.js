const request = require('supertest');
const app = require('../server');

// Mock nodemailer pour éviter toute tentative de connexion SMTP réelle
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

// Helper : créer un user et retourner son token
const registerUser = async (overrides = {}) => {
  const email = overrides.email || `user_${Date.now()}@test.com`;
  const res = await request(app).post('/api/auth/register').send({
    nom: 'Test', prenom: 'User', email, motDePasse: 'password123',
    ...overrides
  });
  return res;
};

describe('Auth Routes', () => {

  // ── Register ──────────────────────────────────────────────
  describe('POST /api/auth/register', () => {

    it('retourne 201 avec token si inscription réussie', async () => {
      const res = await registerUser();
      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBeDefined();
    });

    it('retourne 400 si email déjà existant', async () => {
      const email = `dup_${Date.now()}@test.com`;
      await registerUser({ email });
      const res = await registerUser({ email });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('retourne 400 si champs obligatoires manquants', async () => {
      const res = await request(app).post('/api/auth/register').send({ nom: 'Test' });
      expect(res.statusCode).toBe(400);
    });

  });

  // ── Login ─────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {

    it('retourne 200 avec token si login réussi', async () => {
      const email = `login_${Date.now()}@test.com`;
      await registerUser({ email });
      const res = await request(app).post('/api/auth/login').send({ email, motDePasse: 'password123' });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('retourne 400 si email ou mot de passe manquant', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('retourne 401 si email inconnu', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@test.com', motDePasse: 'wrongpass'
      });
      expect(res.statusCode).toBe(401);
    });

    it('retourne 401 si mauvais mot de passe', async () => {
      const email = `wp_${Date.now()}@test.com`;
      await registerUser({ email });
      const res = await request(app).post('/api/auth/login').send({ email, motDePasse: 'mauvais' });
      expect(res.statusCode).toBe(401);
    });

  });

  // ── Get Me ────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 401 avec token invalide', async () => {
      const res = await request(app).get('/api/auth/me')
        .set('Authorization', 'Bearer tokeninvalide');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 avec les infos du user connecté', async () => {
      const email = `me_${Date.now()}@test.com`;
      const reg = await registerUser({ email });
      const res = await request(app).get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe(email);
    });

  });

  // ── Update Profile ────────────────────────────────────────
  describe('PUT /api/auth/update-profile', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).put('/api/auth/update-profile').send({ nom: 'Nouveau' });
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 si mise à jour réussie', async () => {
      const reg = await registerUser();
      const res = await request(app).put('/api/auth/update-profile')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ nom: 'NouveauNom', prenom: 'NouveauPrenom', departement: 'Informatique' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.nom).toBe('NouveauNom');
    });

  });

  // ── Change Password ───────────────────────────────────────
  describe('PUT /api/auth/change-password', () => {

    it('retourne 401 sans token', async () => {
      const res = await request(app).put('/api/auth/change-password')
        .send({ currentPassword: 'old', newPassword: 'new123' });
      expect(res.statusCode).toBe(401);
    });

    it('retourne 400 si mot de passe actuel incorrect', async () => {
      const reg = await registerUser();
      const res = await request(app).put('/api/auth/change-password')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ currentPassword: 'mauvais', newPassword: 'newpass123' });
      expect(res.statusCode).toBe(400);
    });

    it('retourne 200 si changement réussi', async () => {
      const reg = await registerUser();
      const res = await request(app).put('/api/auth/change-password')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });

  });

  // ── Forgot Password ───────────────────────────────────────
  describe('POST /api/auth/forgot-password', () => {

    it('retourne 404 si email inconnu', async () => {
      const res = await request(app).post('/api/auth/forgot-password')
        .send({ email: 'inconnu@test.com' });
      expect(res.statusCode).toBe(404);
    });

    it('retourne 200 si email connu', async () => {
      const email = `fp_${Date.now()}@test.com`;
      await registerUser({ email });
      const res = await request(app).post('/api/auth/forgot-password').send({ email });
      expect(res.statusCode).toBe(200);
    });

  });

  // ── Reset Password ────────────────────────────────────────
  describe('PUT /api/auth/reset-password/:token', () => {

    it('retourne 400 si token invalide', async () => {
      const res = await request(app).put('/api/auth/reset-password/tokenbidoninvalide')
        .send({ motDePasse: 'nouveaupass123' });
      expect(res.statusCode).toBe(400);
    });

  });

});