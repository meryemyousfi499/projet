jest.mock('../models/User');
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'abc' }),
  }),
}));
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn().mockReturnValue({ toString: () => 'mockedtoken' }),
    createHash: actual.createHash,
  };
});

const User = require('../models/User');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const { chain, mockRes } = require('./helpers');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
  _id: 'userId123',
  nom: 'Dupont',
  prenom: 'Jean',
  email: 'jean@example.com',
  role: 'ROLE_STUDENT',
  departement: 'INFO',
  avatar: null,
  statut: 'actif',
  motDePasse: 'hashed',
  resetPasswordToken: undefined,
  resetPasswordExpire: undefined,
  getSignedJwtToken: jest.fn().mockReturnValue('jwt.token.here'),
  matchPassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('authController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'secret';
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    const req = {
      body: { nom: 'Dupont', prenom: 'Jean', email: 'jean@example.com', motDePasse: '123456', departement: 'INFO' },
    };

    it('returns 400 when email already exists', async () => {
      User.findOne = jest.fn().mockReturnValue(chain({ _id: 'existing' }));

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('creates user and returns token on success', async () => {
      User.findOne = jest.fn().mockReturnValue(chain(null));
      User.create = jest.fn().mockResolvedValue(makeUser());

      await register(req, res);

      expect(User.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'jwt.token.here' }));
    });

    it('returns 400 on DB error', async () => {
      User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB error')) });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns 400 when credentials are missing', async () => {
      const req = { body: {} };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 when user not found', async () => {
      User.findOne = jest.fn().mockReturnValue(chain(null));
      const req = { body: { email: 'x@x.com', motDePasse: 'pass' } };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 when account is inactive', async () => {
      User.findOne = jest.fn().mockReturnValue(chain(makeUser({ statut: 'inactif' })));
      const req = { body: { email: 'jean@example.com', motDePasse: '123456' } };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 when password does not match', async () => {
      const user = makeUser({ matchPassword: jest.fn().mockResolvedValue(false) });
      User.findOne = jest.fn().mockReturnValue(chain(user));
      const req = { body: { email: 'jean@example.com', motDePasse: 'wrong' } };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns token on successful login', async () => {
      User.findOne = jest.fn().mockReturnValue(chain(makeUser()));
      const req = { body: { email: 'jean@example.com', motDePasse: '123456' } };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'jwt.token.here' }));
    });
  });

  // ─── getMe ────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns current user', async () => {
      const req = { user: { id: 'userId123' } };
      User.findById = jest.fn().mockReturnValue(chain(makeUser()));

      await getMe(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── updateProfile ────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates and returns user', async () => {
      const req = { user: { id: 'userId123' }, body: { nom: 'Martin', prenom: 'Luc', departement: 'MATH' } };
      User.findByIdAndUpdate = jest.fn().mockReturnValue(chain(makeUser({ nom: 'Martin' })));

      await updateProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 400 on validation error', async () => {
      const req = { user: { id: 'userId123' }, body: {} };
      User.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('Validation error')) });

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('returns 400 when current password is wrong', async () => {
      const req = { user: { id: 'userId123' }, body: { currentPassword: 'wrong', newPassword: 'newPass' } };
      User.findById = jest.fn().mockReturnValue(chain(makeUser({ matchPassword: jest.fn().mockResolvedValue(false) })));

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('changes password and returns new token', async () => {
      const req = { user: { id: 'userId123' }, body: { currentPassword: 'old', newPassword: 'new' } };
      const user = makeUser();
      User.findById = jest.fn().mockReturnValue(chain(user));

      await changePassword(req, res);

      expect(user.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'jwt.token.here' }));
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns 404 when no user with that email', async () => {
      User.findOne = jest.fn().mockReturnValue(chain(null));
      const req = { body: { email: 'unknown@example.com' } };

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('sends reset email and returns success', async () => {
      const user = makeUser();
      User.findOne = jest.fn().mockReturnValue(chain(user));
      const req = { body: { email: 'jean@example.com' } };

      await forgotPassword(req, res);

      expect(user.save).toHaveBeenCalled();
      expect(user.resetPasswordToken).toBeDefined();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('returns 400 when token is invalid or expired', async () => {
      User.findOne = jest.fn().mockReturnValue(chain(null));
      const req = { params: { token: 'invalidToken' }, body: { motDePasse: 'newpass' } };

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('resets password and returns token on valid token', async () => {
      const user = makeUser();
      User.findOne = jest.fn().mockReturnValue(chain(user));
      const req = { params: { token: 'validtoken' }, body: { motDePasse: 'newpassword' } };

      await resetPassword(req, res);

      expect(user.save).toHaveBeenCalled();
      expect(user.resetPasswordToken).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});