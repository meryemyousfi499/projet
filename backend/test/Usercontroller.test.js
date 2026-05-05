jest.mock('../models/User');

const User = require('../models/User');

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getSupervisors,
  updateAvatar,
} = require('../controllers/userController');

const { chain, mockRes } = require('./helpers');

// chain étendu pour les requêtes avec .select().exec() et .skip().limit().sort().exec()
const chainFull = (value) => ({
  select: jest.fn().mockReturnThis(),
  skip:   jest.fn().mockReturnThis(),
  limit:  jest.fn().mockReturnThis(),
  sort:   jest.fn().mockReturnThis(),
  exec:   jest.fn().mockResolvedValue(value),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
  _id: 'userId123',
  nom: 'Dupont',
  prenom: 'Jean',
  email: 'jean@example.com',
  role: 'ROLE_STUDENT',
  statut: 'actif',
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('userController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
    jest.clearAllMocks();
  });

  // ─── getAllUsers ───────────────────────────────────────────────────────────

  describe('getAllUsers', () => {
    it('returns paginated users with no filters', async () => {
      const req = { query: {} };
      User.countDocuments = jest.fn().mockReturnValue(chain(50));
      User.find = jest.fn().mockReturnValue(chainFull([makeUser()]));

      await getAllUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, total: 50, page: 1, pages: 5 }),
      );
    });

    it('filters by role', async () => {
      const req = { query: { role: 'ROLE_SUPERVISOR' } };
      User.countDocuments = jest.fn().mockReturnValue(chain(5));
      User.find = jest.fn().mockReturnValue(chainFull([]));

      await getAllUsers(req, res);

      expect(User.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ role: 'ROLE_SUPERVISOR' }));
    });

    it('filters by statut', async () => {
      const req = { query: { statut: 'inactif' } };
      User.countDocuments = jest.fn().mockReturnValue(chain(2));
      User.find = jest.fn().mockReturnValue(chainFull([]));

      await getAllUsers(req, res);

      expect(User.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ statut: 'inactif' }));
    });

    it('filters by departement', async () => {
      const req = { query: { departement: 'INFO' } };
      User.countDocuments = jest.fn().mockReturnValue(chain(10));
      User.find = jest.fn().mockReturnValue(chainFull([]));

      await getAllUsers(req, res);

      expect(User.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ departement: 'INFO' }));
    });

    it('applies search regex on nom, prenom, email', async () => {
      const req = { query: { search: 'jean' } };
      User.countDocuments = jest.fn().mockReturnValue(chain(3));
      User.find = jest.fn().mockReturnValue(chainFull([]));

      await getAllUsers(req, res);

      expect(User.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
    });

    it('respects custom page and limit', async () => {
      const req = { query: { page: '3', limit: '5' } };
      User.countDocuments = jest.fn().mockReturnValue(chain(30));
      User.find = jest.fn().mockReturnValue(chainFull([]));

      await getAllUsers(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.page).toBe(3);
      expect(call.pages).toBe(6);
    });

    it('returns 500 on error', async () => {
      const req = { query: {} };
      User.countDocuments = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getUserById ──────────────────────────────────────────────────────────

  describe('getUserById', () => {
    it('returns user by id', async () => {
      const req = { params: { id: 'userId123' } };
      User.findById = jest.fn().mockReturnValue(chain(makeUser()));

      await getUserById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 when user not found', async () => {
      const req = { params: { id: 'userId123' } };
      User.findById = jest.fn().mockReturnValue(chain(null));

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'userId123' } };
      User.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── createUser ───────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('creates user and returns 201', async () => {
      const req = { body: { nom: 'Admin', prenom: 'Root', email: 'root@example.com', role: 'ROLE_ADMIN' } };
      User.create = jest.fn().mockResolvedValue(makeUser({ role: 'ROLE_ADMIN' }));

      await createUser(req, res);

      expect(User.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 on validation error', async () => {
      const req = { body: {} };
      User.create = jest.fn().mockRejectedValue(new Error('Validation error'));

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('updates user without changing password', async () => {
      const req = {
        params: { id: 'userId123' },
        body: { nom: 'Dupont', motDePasse: 'shouldBeIgnored' },
      };
      const updated = makeUser({ nom: 'Dupont' });
      User.findByIdAndUpdate = jest.fn().mockReturnValue(chain(updated));

      await updateUser(req, res);

      const [, updateData] = User.findByIdAndUpdate.mock.calls[0];
      expect(updateData.motDePasse).toBeUndefined();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 when user not found', async () => {
      const req = { params: { id: 'userId123' }, body: { nom: 'Test' } };
      User.findByIdAndUpdate = jest.fn().mockReturnValue(chain(null));

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 on error', async () => {
      const req = { params: { id: 'userId123' }, body: { nom: 'Test' } };
      User.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── deleteUser ───────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('deletes user successfully', async () => {
      const req = { params: { id: 'userId123' } };
      User.findByIdAndDelete = jest.fn().mockReturnValue(chain(makeUser()));

      await deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 when user not found', async () => {
      const req = { params: { id: 'userId123' } };
      User.findByIdAndDelete = jest.fn().mockReturnValue(chain(null));

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'userId123' } };
      User.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── toggleUserStatus ─────────────────────────────────────────────────────

  describe('toggleUserStatus', () => {
    it('returns 404 when user not found', async () => {
      const req = { params: { id: 'userId123' } };
      User.findById = jest.fn().mockReturnValue(chain(null));

      await toggleUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('toggles status from actif to inactif', async () => {
      const req = { params: { id: 'userId123' } };
      const user = makeUser({ statut: 'actif' });
      User.findById = jest.fn().mockReturnValue(chain(user));

      await toggleUserStatus(req, res);

      expect(user.statut).toBe('inactif');
      expect(user.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('toggles status from inactif to actif', async () => {
      const req = { params: { id: 'userId123' } };
      const user = makeUser({ statut: 'inactif' });
      User.findById = jest.fn().mockReturnValue(chain(user));

      await toggleUserStatus(req, res);

      expect(user.statut).toBe('actif');
      expect(user.save).toHaveBeenCalled();
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'userId123' } };
      User.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await toggleUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getSupervisors ───────────────────────────────────────────────────────

  describe('getSupervisors', () => {
    it('returns all active supervisors', async () => {
      const req = {};
      const supervisors = [
        { _id: 'sup1', nom: 'Martin', prenom: 'Paul', email: 'paul@example.com' },
      ];
      // getSupervisors utilise User.find().select().exec() — chainFull obligatoire
      User.find = jest.fn().mockReturnValue(chainFull(supervisors));

      await getSupervisors(req, res);

      expect(User.find).toHaveBeenCalledWith({ role: 'ROLE_SUPERVISOR', statut: 'actif' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: supervisors }));
    });

    it('returns 500 on error', async () => {
      const req = {};
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('fail')),
      });

      await getSupervisors(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateAvatar ─────────────────────────────────────────────────────────

  describe('updateAvatar', () => {
    it('returns 400 when no file uploaded', async () => {
      const req = { user: { id: 'userId123' }, file: undefined };

      await updateAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates avatar URL successfully', async () => {
      const req = {
        user: { id: 'userId123' },
        file: { filename: 'avatar-uuid.jpg' },
      };
      const updatedUser = makeUser({ avatar: '/uploads/avatar-uuid.jpg' });
      User.findByIdAndUpdate = jest.fn().mockReturnValue(chain(updatedUser));

      await updateAvatar(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'userId123',
        { avatar: '/uploads/avatar-uuid.jpg' },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 when user not found after update', async () => {
      const req = { user: { id: 'userId123' }, file: { filename: 'avatar.jpg' } };
      User.findByIdAndUpdate = jest.fn().mockReturnValue(chain(null));

      await updateAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'userId123' }, file: { filename: 'avatar.jpg' } };
      User.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await updateAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});