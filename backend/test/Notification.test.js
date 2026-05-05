const request = require('supertest');
const app = require('../server');

const registerStudent = async () => {
  const email = `student_${Date.now()}_${Math.random().toString(36).substr(2,5)}@test.com`;
  const res = await request(app).post('/api/auth/register').send({
    nom: 'Test', prenom: 'Student', email, motDePasse: 'password123'
  });
  return { token: res.body.token, user: res.body.user };
};

const fakeId = '000000000000000000000001';

describe('Notification Routes', () => {

  // ── GET notifications ─────────────────────────────────────
  describe('GET /api/notifications', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 avec token valide', async () => {
      const { token } = await registerStudent();
      const res = await request(app).get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── MARK ALL as read ──────────────────────────────────────
  describe('PATCH /api/notifications/mark-all-read', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).patch('/api/notifications/mark-all-read');
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 avec token valide', async () => {
      const { token } = await registerStudent();
      const res = await request(app).patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── MARK ONE as read ──────────────────────────────────────
  describe('PATCH /api/notifications/:id/read', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).patch(`/api/notifications/${fakeId}/read`);
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 ou 404 avec token valide', async () => {
      const { token } = await registerStudent();
      const res = await request(app).patch(`/api/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${token}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ── DELETE notification ───────────────────────────────────
  describe('DELETE /api/notifications/:id', () => {
    it('retourne 401 sans token', async () => {
      const res = await request(app).delete(`/api/notifications/${fakeId}`);
      expect(res.statusCode).toBe(401);
    });

    it('retourne 200 ou 404 avec token valide', async () => {
      const { token } = await registerStudent();
      const res = await request(app).delete(`/api/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

});