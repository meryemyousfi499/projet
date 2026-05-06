jest.mock('../models/Notification');

const Notification = require('../models/Notification');

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const { chain, mockRes } = require('../test/helpers');

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('notificationController', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
  });

  // ─── getNotifications ─────────────────────────────────────────────────────

  describe('getNotifications', () => {
    it('returns notifications and unread count for current user', async () => {
      const req = { user: { id: 'userId123' } };
      const notifs = [{ _id: 'n1', message: 'Test', lu: false }];
      Notification.find = jest.fn().mockReturnValue(chain(notifs));
      Notification.countDocuments = jest.fn().mockReturnValue(chain(1));

      await getNotifications(req, res);

      expect(Notification.find).toHaveBeenCalledWith({ userId: 'userId123' });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: notifs, unreadCount: 1 }),
      );
    });

    it('returns empty list when user has no notifications', async () => {
      const req = { user: { id: 'userId123' } };
      Notification.find = jest.fn().mockReturnValue(chain([]));
      Notification.countDocuments = jest.fn().mockReturnValue(chain(0));

      await getNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [], unreadCount: 0 }),
      );
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'userId123' } };
      Notification.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── markAsRead ───────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      const req = { params: { id: 'notifId' } };
      Notification.findByIdAndUpdate = jest.fn().mockReturnValue(chain({}));

      await markAsRead(req, res);

      expect(Notification.findByIdAndUpdate).toHaveBeenCalledWith('notifId', { lu: true });
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'notifId' } };
      Notification.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── markAllAsRead ────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('marks all notifications as read for user', async () => {
      const req = { user: { id: 'userId123' } };
      Notification.updateMany = jest.fn().mockReturnValue(chain({ nModified: 3 }));

      await markAllAsRead(req, res);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        { userId: 'userId123', lu: false },
        { lu: true },
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 500 on error', async () => {
      const req = { user: { id: 'userId123' } };
      Notification.updateMany = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── deleteNotification ───────────────────────────────────────────────────

  describe('deleteNotification', () => {
    it('deletes notification successfully', async () => {
      const req = { params: { id: 'notifId' } };
      Notification.findByIdAndDelete = jest.fn().mockReturnValue(chain({}));

      await deleteNotification(req, res);

      expect(Notification.findByIdAndDelete).toHaveBeenCalledWith('notifId');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 500 on error', async () => {
      const req = { params: { id: 'notifId' } };
      Notification.findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('fail')) });

      await deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});