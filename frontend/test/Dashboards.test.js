import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from '../src/pages/student/StudentDashboard';
import SupervisorDashboard from '../src/pages/supervisor/SupervisorDashboard';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ─── StudentDashboard ─────────────────────────────────────────────────────────

const baseStudentData = {
  myApplications: 2,
  myProject: null,
  evaluation: null,
};

const renderStudent = (data) =>
  render(<MemoryRouter><StudentDashboard data={data} /></MemoryRouter>);

describe('StudentDashboard', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns null when data is falsy', () => {
    const { container } = renderStudent(null);
    expect(container.firstChild).toBeNull();
  });

  test('shows application count stat', () => {
    renderStudent(baseStudentData);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Candidatures')).toBeInTheDocument();
  });

  test('shows empty project state when no project', () => {
    renderStudent(baseStudentData);
    expect(screen.getByText('Pas encore de projet')).toBeInTheDocument();
    expect(screen.getByText('Voir les sujets')).toBeInTheDocument();
  });

  test('navigates to subjects on "Explorer les sujets"', () => {
    renderStudent(baseStudentData);
    fireEvent.click(screen.getByText('Explorer les sujets'));
    expect(mockNavigate).toHaveBeenCalledWith('/subjects');
  });

  test('shows project info when project exists', () => {
    const data = {
      ...baseStudentData,
      myProject: {
        _id: 'p1',
        progression: 65,
        sujetId: { titre: 'Mon Projet PFE', technologies: ['React'] },
        encadrantId: { prenom: 'Ali', nom: 'Ben', email: 'ali@test.com' },
      },
    };
    renderStudent(data);
    expect(screen.getByText('Mon Projet PFE')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('Voir le projet')).toBeInTheDocument();
  });

  test('navigates to project detail on click', () => {
    const data = {
      ...baseStudentData,
      myProject: {
        _id: 'p1',
        progression: 30,
        sujetId: { titre: 'Projet', technologies: [] },
        encadrantId: { prenom: 'A', nom: 'B', email: 'a@b.com' },
      },
    };
    renderStudent(data);
    fireEvent.click(screen.getByText('Voir le projet'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });

  test('shows final grade when evaluation exists', () => {
    const data = { ...baseStudentData, evaluation: { noteFinale: 17 } };
    renderStudent(data);
    expect(screen.getByText('17/20')).toBeInTheDocument();
  });

  test('shows dash when no evaluation', () => {
    renderStudent(baseStudentData);
    expect(screen.getByText('Note finale')).toBeInTheDocument();
  });

  test('shows "Mon projet" quick action when project exists', () => {
    const data = {
      ...baseStudentData,
      myProject: {
        _id: 'p1',
        progression: 10,
        sujetId: { titre: 'T', technologies: [] },
        encadrantId: { prenom: 'A', nom: 'B', email: '' },
      },
    };
    renderStudent(data);
    expect(screen.getAllByText('Mon projet')[0]).toBeInTheDocument();
  });
});

// ─── SupervisorDashboard ──────────────────────────────────────────────────────

const baseSupervisorData = {
  mySubjects: 4,
  activeProjects: 2,
  myProjects: 5,
  pendingApplications: 1,
  recentProjects: [],
};

const renderSupervisor = (data) =>
  render(<MemoryRouter><SupervisorDashboard data={data} /></MemoryRouter>);

describe('SupervisorDashboard', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns null when data is falsy', () => {
    const { container } = renderSupervisor(null);
    expect(container.firstChild).toBeNull();
  });

  test('renders stats correctly', () => {
    renderSupervisor(baseSupervisorData);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Mes sujets')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Projets actifs')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Candidatures en attente')).toBeInTheDocument();
  });

  test('shows empty state for recent projects', () => {
    renderSupervisor(baseSupervisorData);
    expect(screen.getByText('Aucun projet')).toBeInTheDocument();
  });

  test('renders recent projects list', () => {
    const data = {
      ...baseSupervisorData,
      recentProjects: [
        {
          _id: 'p1',
          progression: 45,
          sujetId: { titre: 'Projet IA' },
          etudiants: [{ _id: 'u1', prenom: 'Karim', nom: 'Tazi' }],
        },
      ],
    };
    renderSupervisor(data);
    expect(screen.getByText('Projet IA')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Karim Tazi')).toBeInTheDocument();
  });

  test('navigates to project on click', () => {
    const data = {
      ...baseSupervisorData,
      recentProjects: [
        {
          _id: 'p1',
          progression: 20,
          sujetId: { titre: 'Projet Web' },
          etudiants: [],
        },
      ],
    };
    renderSupervisor(data);
    fireEvent.click(screen.getByText('Projet Web'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });

  test('navigates to my-subjects on quick action', () => {
    renderSupervisor(baseSupervisorData);
    fireEvent.click(screen.getByText('Proposer un sujet'));
    expect(mockNavigate).toHaveBeenCalledWith('/my-subjects');
  });

  test('navigates to applications-review', () => {
    renderSupervisor(baseSupervisorData);
    fireEvent.click(screen.getByRole('button', { name: /Candidatures en attente/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/applications-review');
  });

  test('shows pending count on applications button when > 0', () => {
    renderSupervisor(baseSupervisorData);
    expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
  });

  test('navigates to supervisor-projects', () => {
    renderSupervisor(baseSupervisorData);
    fireEvent.click(screen.getByText('Mes projets'));
    expect(mockNavigate).toHaveBeenCalledWith('/supervisor-projects');
  });
});
