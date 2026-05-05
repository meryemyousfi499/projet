import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import SubjectDetailPage from '../src/pages/shared/SubjectDetailPage';
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
const mockSubject = {
  _id: 's1',
  titre: 'Système de gestion PFE',
  description: 'Une plateforme complète pour gérer les PFE.',
  technologies: ['React', 'Node.js', 'MongoDB'],
  statut: 'validé',
  nombreMaxEtudiants: 3,
  createdAt: '2024-01-15T00:00:00.000Z',
  encadrantId: { _id: 'e1', prenom: 'Ali', nom: 'Bench', email: 'ali@test.com' },
};

const renderPage = ({ role = 'ROLE_STUDENT', subjectId = 's1' } = {}) => {
  useAuth.mockReturnValue({ user: { _id: 'u1', role } });
  return render(
    <MemoryRouter initialEntries={[`/subjects/${subjectId}`]}>
      <Routes>
        <Route path="/subjects/:id" element={<SubjectDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('SubjectDetailPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading state initially', () => {
    api.getSubjectById.mockReturnValue(new Promise(() => {}));
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.getMyGroup.mockResolvedValue({ data: { data: null } });
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('renders subject details', async () => {
    api.getSubjectById.mockResolvedValue({ data: { data: mockSubject } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.getMyGroup.mockResolvedValue({ data: { data: null } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Système de gestion PFE')).toBeInTheDocument();
      expect(screen.getByText('Une plateforme complète pour gérer les PFE.')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Ali Bench')).toBeInTheDocument();
    });
  });

  test('shows "not found" when subject is null', async () => {
    api.getSubjectById.mockRejectedValue(new Error('Not found'));
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.getMyGroup.mockResolvedValue({ data: { data: null } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Sujet non trouvé')).toBeInTheDocument());
  });

  test('prompts student to create group when no group exists', async () => {
    api.getSubjectById.mockResolvedValue({ data: { data: mockSubject } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.getMyGroup.mockResolvedValue({ data: { data: null } });
    renderPage({ role: 'ROLE_STUDENT' });
    await waitFor(() =>
      expect(screen.getByText('Vous devez avoir un groupe')).toBeInTheDocument()
    );
  });

  test('shows "only chef can apply" message for non-chef members', async () => {
    const myGroup = {
      _id: 'g1', nom: 'Groupe Alpha',
      chef: { _id: 'chef1' },
      membres: [{ _id: 'u1' }, { _id: 'chef1' }],
    };
    api.getSubjectById.mockResolvedValue({ data: { data: mockSubject } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.getMyGroup.mockResolvedValue({ data: { data: myGroup } });
    renderPage({ role: 'ROLE_STUDENT' });
    await waitFor(() =>
      expect(screen.getByText('Seul le chef peut postuler')).toBeInTheDocument()
    );
  });

  test('shows apply button for group chef', async () => {
    const myGroup = {
      _id: 'g1', nom: 'Groupe Alpha',
      chef: { _id: 'u1' },
      membres: [{ _id: 'u1' }],
    };
    api.getSubjectById.mockResolvedValue({ data: { data: mockSubject } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.getMyGroup.mockResolvedValue({ data: { data: myGroup } });
    renderPage({ role: 'ROLE_STUDENT' });
    await waitFor(() =>
      expect(screen.getByText('Postuler maintenant')).toBeInTheDocument()
    );
  });

  test('shows "candidature envoyée" if already applied', async () => {
    const myGroup = { _id: 'g1', nom: 'G1', chef: { _id: 'u1' }, membres: [{ _id: 'u1' }] };
    api.getSubjectById.mockResolvedValue({ data: { data: mockSubject } });
    api.getApplications.mockResolvedValue({ data: { data: [{ sujetId: { _id: 's1' } }] } });
    api.getMyGroup.mockResolvedValue({ data: { data: myGroup } });
    renderPage({ role: 'ROLE_STUDENT' });
    await waitFor(() =>
      expect(screen.getByText('Candidature envoyée')).toBeInTheDocument()
    );
  });

  test('submits application via motivation modal', async () => {
    const myGroup = { _id: 'g1', nom: 'G1', chef: { _id: 'u1' }, membres: [{ _id: 'u1' }] };
    api.getSubjectById.mockResolvedValue({ data: { data: mockSubject } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.getMyGroup.mockResolvedValue({ data: { data: myGroup } });
    api.applyToSubject.mockResolvedValue({});
    renderPage({ role: 'ROLE_STUDENT' });
    await waitFor(() => screen.getByText('Postuler maintenant'));
    fireEvent.click(screen.getByText('Postuler maintenant'));
    const textarea = screen.getByPlaceholderText(/Expliquez pourquoi/);
    fireEvent.change(textarea, { target: { value: 'Motivation réelle' } });
    fireEvent.click(screen.getByText('Envoyer'));
    await waitFor(() => {
      expect(api.applyToSubject).toHaveBeenCalledWith('s1', { motivation: 'Motivation réelle' });
      expect(toast.success).toHaveBeenCalledWith('Candidature envoyée!');
    });
  });

  test('hides apply section for supervisor role', async () => {
    api.getSubjectById.mockResolvedValue({ data: { data: mockSubject } });
    renderPage({ role: 'ROLE_SUPERVISOR' });
    await waitFor(() => screen.getByText('Système de gestion PFE'));
    expect(screen.queryByText('Postuler maintenant')).not.toBeInTheDocument();
    expect(screen.queryByText('Candidature envoyée')).not.toBeInTheDocument();
  });
});
