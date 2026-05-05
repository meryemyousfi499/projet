import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import ApplicationsReviewPage from '../src/pages/supervisor/ApplicationsReviewPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast');
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg?.includes?.('React Router')) return;
    console.warn(msg);
  });
});

const mockApplications = [
  {
    _id: 'app1',
    statut: 'en attente',
    motivation: 'Nous sommes très motivés.',
    createdAt: new Date().toISOString(),
    sujetId: {
      _id: 's1',
      titre: 'Système de gestion PFE',
      technologies: ['React', 'Node.js'],
    },
    groupId: {
      _id: 'g1',
      nom: 'Groupe Alpha',
      chef: { _id: 'c1', prenom: 'Karim', nom: 'Tazi' },
      membres: [
        { _id: 'c1', prenom: 'Karim', nom: 'Tazi' },
        { _id: 'm2', prenom: 'Sara', nom: 'Alami' },
      ],
    },
  },
  {
    _id: 'app2',
    statut: 'accepté',
    motivation: '',
    commentaireEncadrant: 'Bienvenue dans le projet!',
    createdAt: new Date().toISOString(),
    sujetId: { _id: 's2', titre: 'Autre sujet', technologies: [] },
    groupId: {
      _id: 'g2',
      nom: 'Groupe Beta',
      chef: { _id: 'c2', prenom: 'Hind', nom: 'Rami' },
      membres: [{ _id: 'c2', prenom: 'Hind', nom: 'Rami' }],
    },
  },
];

const renderPage = () =>
  render(<MemoryRouter><ApplicationsReviewPage /></MemoryRouter>);

describe('ApplicationsReviewPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading state initially', () => {
    api.getApplications.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('renders list of applications', async () => {
    api.getApplications.mockResolvedValue({ data: { data: mockApplications } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Groupe Alpha')).toBeInTheDocument();
      expect(screen.getByText('Groupe Beta')).toBeInTheDocument();
    });
  });

  test('shows group members', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [mockApplications[0]] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/Karim|Sara/)[0]).toBeInTheDocument();
    });
  });

  test('shows motivation text', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [mockApplications[0]] } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Nous sommes très motivés/)).toBeInTheDocument()
    );
  });

  test('shows accept/refuse buttons only for pending applications', async () => {
    api.getApplications.mockResolvedValue({ data: { data: mockApplications } });
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    expect(screen.getByText('Accepter le groupe')).toBeInTheDocument();
    expect(screen.getByText('Refuser')).toBeInTheDocument();
    // app2 is already accepted, no buttons
    expect(screen.getAllByText('Accepter le groupe')).toHaveLength(1);
  });

  test('opens accept modal with project creation info', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [mockApplications[0]] } });
    renderPage();
    await waitFor(() => screen.getByText('Accepter le groupe'));
    fireEvent.click(screen.getByText('Accepter le groupe'));
    expect(screen.getByText(/Confirmer l'acceptation/)).toBeInTheDocument();
    expect(screen.getByText(/Un projet sera automatiquement créé/)).toBeInTheDocument();
  });

  test('opens refuse modal', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [mockApplications[0]] } });
    renderPage();
    await waitFor(() => screen.getByText('Refuser'));
    fireEvent.click(screen.getByText('Refuser'));
    expect(screen.getByText('Confirmer le refus')).toBeInTheDocument();
  });

  test('accepts application and shows success toast', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [mockApplications[0]] } });
    api.updateApplication.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText('Accepter le groupe'));
    fireEvent.click(screen.getByText('Accepter le groupe'));
    fireEvent.click(screen.getByText(/Confirmer l'acceptation/));
    await waitFor(() => {
      expect(api.updateApplication).toHaveBeenCalledWith('app1', {
        statut: 'accepté',
        commentaireEncadrant: '',
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Candidature acceptée')
      );
    });
  });

  test('refuses application and shows toast', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [mockApplications[0]] } });
    api.updateApplication.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText('Refuser'));
    fireEvent.click(screen.getByText('Refuser'));
    const commentInput = screen.getByPlaceholderText(/Expliquez pourquoi/);
    fireEvent.change(commentInput, { target: { value: 'Non pertinent' } });
    fireEvent.click(screen.getByText('Confirmer le refus'));
    await waitFor(() => {
      expect(api.updateApplication).toHaveBeenCalledWith('app1', {
        statut: 'refusé',
        commentaireEncadrant: 'Non pertinent',
      });
      expect(toast.success).toHaveBeenCalledWith('Candidature refusée');
    });
  });

  test('shows empty state when no applications', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Aucune candidature')).toBeInTheDocument());
  });

  test('filter tabs call API with correct statut', async () => {
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => screen.getByText('Toutes'));
    fireEvent.click(screen.getByText('Toutes'));
    expect(api.getApplications).toHaveBeenCalledWith({ statut: undefined });
  });

  test('shows error toast on API failure', async () => {
    api.getApplications.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
  });
});


