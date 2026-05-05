import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../src/pages/admin/AdminDashboard';
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

const mockData = {
  totalUsers: 120,
  totalStudents: 90,
  totalSupervisors: 20,
  pendingSubjects: 5,
  activeProjects: 15,
  completedProjects: 8,
  pendingApplications: 3,
  avgGrade: 14.5,
  recentProjects: [
    {
      _id: 'p1',
      sujetId: { titre: 'Projet IA' },
      etudiants: [{ prenom: 'Alice', nom: 'Martin' }],
      progression: 60,
    },
  ],
  projectsByDept: [
    { _id: 'Informatique', count: 10 },
    { _id: 'Réseaux', count: 5 },
  ],
};

function renderDashboard(data = mockData) {
  return render(<MemoryRouter><AdminDashboard data={data} /></MemoryRouter>);
}

describe('AdminDashboard', () => {
  test('ne rend rien quand data est null', () => {
    const { container } = render(<MemoryRouter><AdminDashboard data={null} /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });

  test('affiche le titre du dashboard', () => {
    renderDashboard();
    expect(screen.getByText(/Dashboard Admin/)).toBeInTheDocument();
  });

  test('affiche les stats correctement', () => {
    renderDashboard();
    expect(screen.getByText('120')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('90')).toBeInTheDocument();  // totalStudents
    expect(screen.getByText('15')).toBeInTheDocument();  // activeProjects
  });

  test('affiche la note moyenne avec /20', () => {
    renderDashboard();
    expect(screen.getByText('14.5/20')).toBeInTheDocument();
  });

  test('affiche les projets récents', () => {
    renderDashboard();
    expect(screen.getByText('Projet IA')).toBeInTheDocument();
    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
  });

  test('affiche la progression du projet', () => {
    renderDashboard();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  test('navigue vers /projects/:id au clic sur un projet', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Projet IA'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });

  test('affiche les départements', () => {
    renderDashboard();
    expect(screen.getByText('Informatique')).toBeInTheDocument();
    expect(screen.getByText('Réseaux')).toBeInTheDocument();
  });

  test('navigue vers /users au clic sur le bouton utilisateurs', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Gérer les utilisateurs'));
    expect(mockNavigate).toHaveBeenCalledWith('/users');
  });

  test('navigue vers /admin-subjects au clic sur le bouton sujets', () => {
    renderDashboard();
    fireEvent.click(screen.getByText(/Valider les sujets/));
    expect(mockNavigate).toHaveBeenCalledWith('/admin-subjects');
  });

  test('navigue vers /admin-projects au clic sur le bouton projets', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Voir tous les projets'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin-projects');
  });

  test('affiche le compteur de sujets en attente dans le bouton', () => {
    renderDashboard();
    expect(screen.getByText(/Valider les sujets \(5\)/)).toBeInTheDocument();
  });

  test('affiche "Aucun projet" si recentProjects est vide', () => {
    renderDashboard({ ...mockData, recentProjects: [] });
    expect(screen.getByText('Aucun projet')).toBeInTheDocument();
  });
});
