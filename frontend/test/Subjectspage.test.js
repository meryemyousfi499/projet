import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import SubjectsPage from '../src/pages/shared/SubjectsPage';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext');
jest.mock('../src/services/api');
jest.mock('react-hot-toast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg?.includes?.('React Router')) return;
    console.warn(msg);
  });
});

const mockSubjects = [
  {
    _id: 's1',
    titre: 'Application Mobile PFE',
    description: 'Développement d\'une app React Native',
    technologies: ['React Native', 'Node.js'],
    statut: 'validé',
    nombreMaxEtudiants: 3,
    encadrantId: { _id: 'e1', prenom: 'Ali', nom: 'Ben', email: 'ali@test.com' },
  },
  {
    _id: 's2',
    titre: 'Plateforme e-learning',
    description: 'LMS complet avec IA',
    technologies: ['Python', 'Django'],
    statut: 'validé',
    nombreMaxEtudiants: 2,
    encadrantId: { _id: 'e2', prenom: 'Sara', nom: 'Alami', email: 'sara@test.com' },
  },
];

const renderPage = (role = 'ROLE_STUDENT') => {
  useAuth.mockReturnValue({ user: { _id: 'u1', role } });
  return render(<MemoryRouter><SubjectsPage /></MemoryRouter>);
};

describe('SubjectsPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading state', () => {
    api.getSubjects.mockReturnValue(new Promise(() => {}));
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('renders list of subjects', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: mockSubjects } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Application Mobile PFE')).toBeInTheDocument();
      expect(screen.getByText('Plateforme e-learning')).toBeInTheDocument();
    });
  });

  test('shows empty state when no subjects', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: [] } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Aucun sujet trouvé')).toBeInTheDocument());
  });

  test('shows "Postuler" button for student on validated subjects', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: mockSubjects } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage('ROLE_STUDENT');
    await waitFor(() => {
      const applyButtons = screen.getAllByText('Postuler');
      expect(applyButtons.length).toBe(2);
    });
  });

  test('shows "Candidaté" badge for already-applied subjects', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: mockSubjects } });
    api.getApplications.mockResolvedValue({
      data: { data: [{ sujetId: 's1' }] },
    });
    renderPage('ROLE_STUDENT');
    await waitFor(() => expect(screen.getByText('Candidaté')).toBeInTheDocument());
  });

  test('does not show Postuler button for supervisor role', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: mockSubjects } });
    renderPage('ROLE_SUPERVISOR');
    await waitFor(() => screen.getByText('Application Mobile PFE'));
    expect(screen.queryByText('Postuler')).not.toBeInTheDocument();
  });

  test('opens apply modal on click', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: [mockSubjects[0]] } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage('ROLE_STUDENT');
    await waitFor(() => screen.getByText('Postuler'));
    fireEvent.click(screen.getByText('Postuler'));
    expect(screen.getByText('Postuler au sujet')).toBeInTheDocument();
  });

  test('submits application through modal', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: [mockSubjects[0]] } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.applyToSubject.mockResolvedValue({});
    renderPage('ROLE_STUDENT');
    await waitFor(() => screen.getByText('Postuler'));
    fireEvent.click(screen.getByText('Postuler'));
    const textarea = screen.getByPlaceholderText(/Décrivez votre motivation/);
    fireEvent.change(textarea, { target: { value: 'Ma lettre de motivation' } });
    fireEvent.click(screen.getByText("Envoyer ma candidature"));
    await waitFor(() => {
      expect(api.applyToSubject).toHaveBeenCalledWith('s1', { motivation: 'Ma lettre de motivation' });
      expect(toast.success).toHaveBeenCalledWith('Candidature envoyée avec succès!');
    });
  });

  test('resets filters on button click', async () => {
    api.getSubjects.mockResolvedValue({ data: { data: mockSubjects } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage('ROLE_STUDENT');
    await waitFor(() => screen.getByText('Application Mobile PFE'));
    const searchInput = screen.getByPlaceholderText('Rechercher un sujet...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.click(screen.getByText('Réinitialiser'));
    expect(searchInput.value).toBe('');
  });

  test('shows error toast on failed fetch', async () => {
    api.getSubjects.mockRejectedValue(new Error('Network error'));
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erreur lors du chargement des sujets')
    );
  });
});
