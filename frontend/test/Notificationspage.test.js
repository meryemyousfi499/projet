import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import NotificationsPage from '../src/pages/shared/NotificationsPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast');
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg?.includes?.('React Router')) return;
    console.warn(msg);
  });
});
const mockNotifications = [
  { _id: 'n1', message: 'Notification 1', type: 'info',    lu: false, createdAt: new Date().toISOString() },
  { _id: 'n2', message: 'Notification 2', type: 'success', lu: true,  createdAt: new Date().toISOString() },
];

const renderPage = () =>
  render(<MemoryRouter><NotificationsPage /></MemoryRouter>);

describe('NotificationsPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading state initially', () => {
    api.getNotifications.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('renders notifications list', async () => {
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Notification 1')).toBeInTheDocument();
      expect(screen.getByText('Notification 2')).toBeInTheDocument();
    });
  });

  test('shows unread count', async () => {
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications } });
    renderPage();
    await waitFor(() => expect(screen.getByText('1 non lue(s)')).toBeInTheDocument());
  });

  test('shows empty state when no notifications', async () => {
    api.getNotifications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Aucune notification')).toBeInTheDocument());
  });

  test('marks single notification as read', async () => {
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications } });
    api.markAsRead.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText('Notification 1'));
    // click the single "mark read" button (only on unread n1)
    const markBtn = screen.getAllByTitle('Marquer comme lu')[0];
    fireEvent.click(markBtn);
    await waitFor(() => expect(api.markAsRead).toHaveBeenCalledWith('n1'));
  });

  test('mark all as read calls API and shows toast', async () => {
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications } });
    api.markAllAsRead.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText('Tout marquer comme lu'));
    fireEvent.click(screen.getByText('Tout marquer comme lu'));
    await waitFor(() => {
      expect(api.markAllAsRead).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Toutes les notifications marquées comme lues');
    });
  });

  test('deletes a notification', async () => {
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications } });
    api.deleteNotification.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText('Notification 1'));
    const deleteButtons = screen.getAllByTitle('Supprimer');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(api.deleteNotification).toHaveBeenCalledWith('n1'));
  });

  test('hides "mark all" button when all notifications are read', async () => {
    const allRead = mockNotifications.map(n => ({ ...n, lu: true }));
    api.getNotifications.mockResolvedValue({ data: { data: allRead } });
    renderPage();
    await waitFor(() => screen.getByText('Notification 1'));
    expect(screen.queryByText('Tout marquer comme lu')).not.toBeInTheDocument();
  });

  test('shows error toast when fetch fails', async () => {
    api.getNotifications.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
  });
});
