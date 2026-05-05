import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import MyProjectPage from '../src/pages/student/MyProjectPage';
import SupervisorProjectsPage from '../src/pages/supervisor/SupervisorProjectsPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast');
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg?.includes?.('React Router')) return;
    console.warn(msg);
  });
});
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockProject = {
  _id: 'p1',
  statut: 'en cours',
  progression: 40,
  sujetId: {
    titre: 'Plateforme PFE',
    description: 'Gestion complète des PFE.',
    technologies: ['React', 'Node.js'],
  },
  encadrantId: { _id: 'e1', prenom: 'Ali', nom: 'Ben', email: 'ali@test.com' },
  etudiants: [
    { _id: 'u1', prenom: 'Karim', nom: 'Tazi' },
    { _id: 'u2', prenom: 'Sara', nom: 'Alami' },
  ],
};

// ─── MyProjectPage ────────────────────────────────────────────────────────────

describe('MyProjectPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading initially', () => {
    api.getProjects.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><MyProjectPage /></MemoryRouter>);
    expect(document.querySelector('.spinner') || document.querySelector('.loading-spinner')).toBeTruthy();
  });

  test('shows empty state when no project', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter><MyProjectPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Pas encore de projet')).toBeInTheDocument();
      expect(screen.getByText('Voir les sujets')).toBeInTheDocument();
    });
  });

  test('navigates to subjects from empty state', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter><MyProjectPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Voir les sujets'));
    fireEvent.click(screen.getByText('Voir les sujets'));
    expect(mockNavigate).toHaveBeenCalledWith('/subjects');
  });

  test('renders project info', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [mockProject] } });
    render(<MemoryRouter><MyProjectPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getAllByText('Plateforme PFE')[0]).toBeInTheDocument();
      expect(screen.getAllByText('40%')[0]).toBeInTheDocument();
      expect(screen.getByText('Gestion complète des PFE.')).toBeInTheDocument();
      expect(screen.getByText('Ali Ben')).toBeInTheDocument();
    });
  });

  test('shows technology tags', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [mockProject] } });
    render(<MemoryRouter><MyProjectPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });
  });

  test('navigates to project detail on button click', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [mockProject] } });
    render(<MemoryRouter><MyProjectPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Accéder au projet complet'));
    fireEvent.click(screen.getByText('Accéder au projet complet'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });

  test('shows error toast on failed fetch', async () => {
    api.getProjects.mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><MyProjectPage /></MemoryRouter>);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
  });
});

// ─── SupervisorProjectsPage ───────────────────────────────────────────────────

describe('SupervisorProjectsPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading initially', () => {
    api.getProjects.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    expect(document.querySelector('.spinner') || document.querySelector('.loading-spinner')).toBeTruthy();
  });

  test('shows empty state when no projects', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Aucun projet')).toBeInTheDocument());
  });

  test('renders project cards', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [mockProject] } });
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Plateforme PFE')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('Karim Tazi')).toBeInTheDocument();
    });
  });

  test('shows project count in subtitle', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [mockProject] } });
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText('1 projet(s) encadré(s)')).toBeInTheDocument()
    );
  });

  test('navigates to project detail on card click', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [mockProject] } });
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Plateforme PFE'));
    fireEvent.click(screen.getByText('Plateforme PFE'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });

  test('shows correct badge for "en cours" status', async () => {
    api.getProjects.mockResolvedValue({ data: { data: [mockProject] } });
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('en cours')).toBeInTheDocument();
    });
  });

  test('shows correct badge for "terminé" status', async () => {
    const finished = { ...mockProject, statut: 'terminé' };
    api.getProjects.mockResolvedValue({ data: { data: [finished] } });
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('terminé')).toBeInTheDocument());
  });

  test('shows error toast on API failure', async () => {
    api.getProjects.mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><SupervisorProjectsPage /></MemoryRouter>);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
  });
});


