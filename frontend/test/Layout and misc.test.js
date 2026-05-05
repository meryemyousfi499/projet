// ============================================================
// Header.test.js
// ============================================================
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../src/components/layout/Header';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext');
jest.mock('../src/services/api');
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const mockUser = { _id: 'u1', prenom: 'Jean', nom: 'Dupont', departement: 'Informatique', role: 'ROLE_STUDENT' };

const mockNotifications = [
  { _id: 'n1', message: 'Nouvelle notification', type: 'info', lu: false, createdAt: new Date().toISOString(), lien: '/projects/p1' },
  { _id: 'n2', message: 'Notification lue', type: 'success', lu: true, createdAt: new Date().toISOString(), lien: null },
];

describe('Header', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders user name and department', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications, unreadCount: 1 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Jean Dupont')).toBeInTheDocument());
    expect(screen.getByText('Informatique')).toBeInTheDocument();
  });

  test('shows notification badge count', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications, unreadCount: 3 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
  });

  test('opens notification dropdown on bell click', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications, unreadCount: 1 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Nouvelle notification')).toBeInTheDocument();
  });

  test('shows empty state when no notifications', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: [], unreadCount: 0 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    expect(screen.getByText('Aucune notification')).toBeInTheDocument();
  });

  test('marks all notifications as read', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications, unreadCount: 1 } });
    api.markAllAsRead.mockResolvedValue({});
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    fireEvent.click(screen.getByText('Tout lire'));
    await waitFor(() => expect(api.markAllAsRead).toHaveBeenCalled());
  });

  test('marks single notification as read and navigates', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications, unreadCount: 1 } });
    api.markAsRead.mockResolvedValue({});
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    fireEvent.click(screen.getByText('Nouvelle notification'));
    await waitFor(() => {
      expect(api.markAsRead).toHaveBeenCalledWith('n1');
      expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
    });
  });

  test('clicking notification with no link does not navigate', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: [mockNotifications[1]], unreadCount: 0 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    fireEvent.click(screen.getByText('Notification lue'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('navigates to /notifications on "Voir tout"', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: [], unreadCount: 0 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    fireEvent.click(screen.getByText('Voir tout'));
    expect(mockNavigate).toHaveBeenCalledWith('/notifications');
  });

  test('navigates to /profile on user click', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: [], unreadCount: 0 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(screen.getByText('Jean Dupont').closest('.header-user'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  test('closes dropdown when clicking outside', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: mockNotifications, unreadCount: 1 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    );
  });

  test('shows search input', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: [], unreadCount: 0 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument();
  });

  test('shows user initials in avatar', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: [], unreadCount: 0 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('JD'));
  });

  test('shows different notification type colors', async () => {
    const notifs = [
      { _id: 'n1', message: 'success msg', type: 'success', lu: false, createdAt: new Date().toISOString() },
      { _id: 'n2', message: 'error msg', type: 'error', lu: false, createdAt: new Date().toISOString() },
      { _id: 'n3', message: 'warning msg', type: 'warning', lu: false, createdAt: new Date().toISOString() },
    ];
    useAuth.mockReturnValue({ user: mockUser });
    api.getNotifications.mockResolvedValue({ data: { data: notifs, unreadCount: 3 } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => screen.getByText('Jean Dupont'));
    fireEvent.click(document.querySelector('.notif-btn'));
    expect(screen.getByText('success msg')).toBeInTheDocument();
    expect(screen.getByText('error msg')).toBeInTheDocument();
    expect(screen.getByText('warning msg')).toBeInTheDocument();
  });
});


// ============================================================
// Sidebar.test.js
// ============================================================
import Sidebar from '../src/components/layout/Sidebar';

jest.mock('../src/services/api');
jest.mock('../src/context/AuthContext');

describe('Sidebar', () => {
  afterEach(() => jest.clearAllMocks());

  const renderSidebar = (user) => {
    useAuth.mockReturnValue({ user, logout: jest.fn() });
    api.getUnreadCounts.mockResolvedValue({ data: { data: { total: 3 } } });
    return render(<MemoryRouter><Sidebar /></MemoryRouter>);
  };

  test('renders logo and title', async () => {
    renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    expect(screen.getByText('PFE')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();
  });

  test('renders student nav items', async () => {
    renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sujets')).toBeInTheDocument();
      expect(screen.getByText('Mon groupe')).toBeInTheDocument();
      expect(screen.getByText('Mon projet')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });
  });

  test('renders supervisor nav items', async () => {
    renderSidebar({ _id: 'sup1', prenom: 'Ali', nom: 'Ben', role: 'ROLE_SUPERVISOR' });
    await waitFor(() => {
      expect(screen.getByText('Mes sujets')).toBeInTheDocument();
      expect(screen.getByText('Mes projets')).toBeInTheDocument();
      expect(screen.getByText('Candidatures')).toBeInTheDocument();
    });
  });

  test('renders admin nav items', async () => {
    renderSidebar({ _id: 'admin1', prenom: 'Admin', nom: 'User', role: 'ROLE_ADMIN' });
    await waitFor(() => {
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
      expect(screen.getByText('Projets')).toBeInTheDocument();
    });
  });

  test('shows unread badge for messages', async () => {
    renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    await waitFor(() => {
      const badges = screen.getAllByText('3');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  test('does not fetch unread count for admin', async () => {
    renderSidebar({ _id: 'admin1', prenom: 'Admin', nom: 'User', role: 'ROLE_ADMIN' });
    await waitFor(() => screen.getByText('Dashboard'));
    expect(api.getUnreadCounts).not.toHaveBeenCalled();
  });

  test('collapses sidebar on button click', async () => {
    const { container } = renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    await waitFor(() => screen.getByText('Management'));
    fireEvent.click(document.querySelector('.collapse-btn'));
    await waitFor(() =>
      expect(container.querySelector('.sidebar.collapsed')).toBeInTheDocument()
    );
  });

  test('expands sidebar on second click', async () => {
    const { container } = renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    await waitFor(() => screen.getByText('Management'));
    fireEvent.click(document.querySelector('.collapse-btn'));
    fireEvent.click(document.querySelector('.collapse-btn'));
    await waitFor(() =>
      expect(container.querySelector('.sidebar.collapsed')).not.toBeInTheDocument()
    );
  });

  test('hides text when collapsed', async () => {
    renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    await waitFor(() => screen.getByText('Management'));
    fireEvent.click(document.querySelector('.collapse-btn'));
    await waitFor(() =>
      expect(screen.queryByText('Management')).not.toBeInTheDocument()
    );
  });

  test('logs out on logout button click', async () => {
    const mockLogout = jest.fn();
    useAuth.mockReturnValue({
      user: { _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' },
      logout: mockLogout,
    });
    api.getUnreadCounts.mockResolvedValue({ data: { data: { total: 0 } } });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    await waitFor(() => screen.getByText('Déconnexion'));
    fireEvent.click(screen.getByText('Déconnexion'));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('shows user initials in sidebar avatar', async () => {
    renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    await waitFor(() => expect(screen.getByText('JD')).toBeInTheDocument());
  });

  test('shows role label for student', async () => {
    renderSidebar({ _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' });
    await waitFor(() => expect(screen.getByText('Étudiant')).toBeInTheDocument());
  });

  test('shows role label for supervisor', async () => {
    renderSidebar({ _id: 'sup1', prenom: 'Ali', nom: 'Ben', role: 'ROLE_SUPERVISOR' });
    await waitFor(() => expect(screen.getByText('Encadrant')).toBeInTheDocument());
  });

  test('shows role label for admin', async () => {
    renderSidebar({ _id: 'admin', prenom: 'Admin', nom: 'U', role: 'ROLE_ADMIN' });
    await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument());
  });

  test('handles unread count fetch error gracefully', async () => {
    useAuth.mockReturnValue({ user: { _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' }, logout: jest.fn() });
    api.getUnreadCounts.mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    await waitFor(() => screen.getByText('Dashboard'));
    // Should not crash
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});


// ============================================================
// StatsGrid.test.js
// ============================================================
import StatsGrid from '../src/components/common/StatsGrid';
import { FiUsers, FiBriefcase } from 'react-icons/fi';

describe('StatsGrid', () => {
  const stats = [
    { label: 'Utilisateurs', value: 42, icon: FiUsers, color: '#fff', bg: '#000' },
    { label: 'Projets', value: 10, icon: FiBriefcase, color: '#fff', bg: '#111' },
  ];

  test('renders all stat cards', () => {
    render(<StatsGrid stats={stats} />);
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Projets')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  test('renders correct number of stat cards', () => {
    const { container } = render(<StatsGrid stats={stats} />);
    expect(container.querySelectorAll('.stat-card').length).toBe(2);
  });

  test('renders with empty stats array', () => {
    const { container } = render(<StatsGrid stats={[]} />);
    expect(container.querySelectorAll('.stat-card').length).toBe(0);
  });

  test('applies background color to icon container', () => {
    render(<StatsGrid stats={stats} />);
    const iconDivs = document.querySelectorAll('.stat-icon');
    expect(iconDivs[0].style.background).toBe('rgb(0, 0, 0)');
  });
});


// ============================================================
// AppLayout.test.js
// ============================================================
import AppLayout from '../src/components/layout/AppLayout';

jest.mock('../src/components/layout/Sidebar', () => () => <div data-testid="sidebar">Sidebar</div>);
jest.mock('../src/components/layout/Header', () => () => <div data-testid="header">Header</div>);
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div data-testid="outlet">Content</div>,
  useNavigate: () => jest.fn(),
}));

describe('AppLayout', () => {
  test('renders sidebar, header, and outlet', () => {
    render(<MemoryRouter><AppLayout /></MemoryRouter>);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  test('has app-layout class', () => {
    const { container } = render(<MemoryRouter><AppLayout /></MemoryRouter>);
    expect(container.querySelector('.app-layout')).toBeInTheDocument();
  });

  test('has main-content class', () => {
    const { container } = render(<MemoryRouter><AppLayout /></MemoryRouter>);
    expect(container.querySelector('.main-content')).toBeInTheDocument();
  });

  test('page-content has fade-in class', () => {
    const { container } = render(<MemoryRouter><AppLayout /></MemoryRouter>);
    expect(container.querySelector('.page-content.fade-in')).toBeInTheDocument();
  });
});


// ============================================================
// MyApplicationsPage.test.js
// ============================================================
import MyApplicationsPage from '../src/pages/student/MyApplicationsPage';

describe('MyApplicationsPage', () => {
  test('renders redirect spinner', () => {
    // useNavigate is already mocked at the top of the file via mockNavigate
    render(<MemoryRouter><MyApplicationsPage /></MemoryRouter>);
    expect(document.querySelector('.spinner') || screen.queryByText('Redirection...')).toBeTruthy();
  });
});


// ============================================================
// AuthLayout.test.js
// ============================================================
import AuthLayout from '../src/pages/auth/AuthLayout';

describe('AuthLayout', () => {
  test('renders children', () => {
    render(
      <MemoryRouter>
        <AuthLayout><div data-testid="child">Child Content</div></AuthLayout>
      </MemoryRouter>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('renders auth-page container', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthLayout><div>Content</div></AuthLayout>
      </MemoryRouter>
    );
    expect(container.querySelector('.auth-page')).toBeInTheDocument();
  });

  test('renders form side container', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthLayout><div>Content</div></AuthLayout>
      </MemoryRouter>
    );
    expect(container.querySelector('.auth-form-side')).toBeInTheDocument();
  });
});