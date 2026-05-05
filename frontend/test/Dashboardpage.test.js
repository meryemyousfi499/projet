import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../src/pages/shared/DashboardPage';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext');
jest.mock('../src/services/api');
jest.mock('../src/pages/admin/AdminDashboard', () => () => <div>AdminDashboard</div>);
jest.mock('../src/pages/supervisor/SupervisorDashboard', () => () => <div>SupervisorDashboard</div>);
jest.mock('../src/pages/student/StudentDashboard', () => () => <div>StudentDashboard</div>);
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg?.includes?.('React Router')) return;
    console.warn(msg);
  });
});
const renderPage = () =>
  render(<MemoryRouter><DashboardPage /></MemoryRouter>);

describe('DashboardPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading spinner initially', () => {
    useAuth.mockReturnValue({ user: { role: 'ROLE_STUDENT' } });
    api.getStudentDashboard.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('renders StudentDashboard for ROLE_STUDENT', async () => {
    useAuth.mockReturnValue({ user: { role: 'ROLE_STUDENT' } });
    api.getStudentDashboard.mockResolvedValue({ data: { data: { myApplications: 2 } } });
    renderPage();
    await waitFor(() => expect(screen.getByText('StudentDashboard')).toBeInTheDocument());
  });

  test('renders SupervisorDashboard for ROLE_SUPERVISOR', async () => {
    useAuth.mockReturnValue({ user: { role: 'ROLE_SUPERVISOR' } });
    api.getSupervisorDashboard.mockResolvedValue({ data: { data: { mySubjects: 3 } } });
    renderPage();
    await waitFor(() => expect(screen.getByText('SupervisorDashboard')).toBeInTheDocument());
  });

  test('renders AdminDashboard for ROLE_ADMIN', async () => {
    useAuth.mockReturnValue({ user: { role: 'ROLE_ADMIN' } });
    api.getAdminDashboard.mockResolvedValue({ data: { data: {} } });
    renderPage();
    await waitFor(() => expect(screen.getByText('AdminDashboard')).toBeInTheDocument());
  });

  test('does not fetch when user is null', () => {
    useAuth.mockReturnValue({ user: null });
    renderPage();
    expect(api.getStudentDashboard).not.toHaveBeenCalled();
    expect(api.getSupervisorDashboard).not.toHaveBeenCalled();
    expect(api.getAdminDashboard).not.toHaveBeenCalled();
  });

  test('calls getAdminDashboard for admin role', async () => {
    useAuth.mockReturnValue({ user: { role: 'ROLE_ADMIN' } });
    api.getAdminDashboard.mockResolvedValue({ data: { data: {} } });
    renderPage();
    await waitFor(() => expect(api.getAdminDashboard).toHaveBeenCalledTimes(1));
  });
});
