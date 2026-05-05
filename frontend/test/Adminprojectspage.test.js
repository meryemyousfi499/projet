import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminProjectsPage from '../src/pages/admin/AdminProjectsPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockProjects = [
  {
    _id: 'p1',
    sujetId: { titre: 'Projet IA' },
    etudiants: [{ prenom: 'Alice', nom: 'Martin' }],
    encadrantId: { prenom: 'Paul', nom: 'Durand' },
    progression: 75,
    statut: 'en cours',
  },
  {
    _id: 'p2',
    sujetId: { titre: 'Projet Web' },
    etudiants: [{ prenom: 'Bob', nom: 'Leroy' }],
    encadrantId: { prenom: 'Marie', nom: 'Blanc' },
    progression: 100,
    statut: 'terminé',
  },
];

function renderPage() {
  return render(<MemoryRouter><AdminProjectsPage /></MemoryRouter>);
}

describe('AdminProjectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getProjects.mockResolvedValue({ data: { data: mockProjects } });
  });

  test('affiche un spinner pendant le chargement', () => {
    api.getProjects.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('affiche les projets après chargement', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Projet IA')).toBeInTheDocument());
    expect(screen.getByText('Projet Web')).toBeInTheDocument();
  });

  test('affiche les encadrants', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Paul Durand')).toBeInTheDocument());
    expect(screen.getByText('Marie Blanc')).toBeInTheDocument();
  });

  test('affiche les étudiants', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice Martin')).toBeInTheDocument());
  });

  test('affiche les progressions', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('75%')).toBeInTheDocument());
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('affiche les badges de statut', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('en cours')[0]).toBeInTheDocument());
    expect(screen.getAllByText('terminé')[0]).toBeInTheDocument();
  });

  test('filtre par statut "en cours"', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getAllByText('en cours')[0]);
    await waitFor(() => {
      expect(api.getProjects).toHaveBeenCalledWith({ statut: 'en cours' });
    });
  });

  test('filtre par "Tous" réinitialise le filtre', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Tous'));
    await waitFor(() => {
      expect(api.getProjects).toHaveBeenCalledWith({ statut: undefined });
    });
  });

  test('navigue vers le détail du projet au clic sur l\'œil', async () => {
    mockNavigate.mockClear();
    api.getProjects.mockResolvedValue({ data: { data: mockProjects } });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    const eyeButtons = document.querySelectorAll('td .btn-secondary.btn-sm');
    fireEvent.click(eyeButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });

  test('affiche "Aucun projet" si la liste est vide', async () => {
    api.getProjects.mockResolvedValueOnce({ data: { data: [] } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Aucun projet')).toBeInTheDocument());
  });

  test('affiche le nombre de projets dans le sous-titre', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('2 projet(s)')).toBeInTheDocument());
  });
});


