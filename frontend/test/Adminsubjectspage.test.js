import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSubjectsPage from '../src/pages/admin/AdminSubjectsPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockSubjects = [
  {
    _id: 's1',
    titre: 'IA et Machine Learning',
    description: 'Étude des algorithmes ML',
    encadrantId: { prenom: 'Paul', nom: 'Durand' },
    technologies: ['Python', 'TensorFlow', 'Keras'],
    statut: 'proposé',
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    _id: 's2',
    titre: 'Application Web React',
    description: 'Développement d\'une SPA',
    encadrantId: { prenom: 'Marie', nom: 'Blanc' },
    technologies: ['React', 'Node.js'],
    statut: 'validé',
    createdAt: '2024-01-05T00:00:00Z',
  },
];

function renderPage() {
  return render(<MemoryRouter><AdminSubjectsPage /></MemoryRouter>);
}

describe('AdminSubjectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getSubjects.mockResolvedValue({ data: { data: mockSubjects } });
  });

  test('affiche un spinner pendant le chargement', () => {
    api.getSubjects.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('affiche les sujets après chargement', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('IA et Machine Learning')).toBeInTheDocument());
    expect(screen.getByText('Application Web React')).toBeInTheDocument();
  });

  test('affiche les encadrants', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Paul Durand')).toBeInTheDocument());
  });

  test('affiche les technologies (max 3)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Python')).toBeInTheDocument());
    expect(screen.getByText('TensorFlow')).toBeInTheDocument();
    expect(screen.getByText('Keras')).toBeInTheDocument();
  });

  test('affiche les badges de statut', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('proposé')).toBeInTheDocument());
    expect(screen.getAllByText('validé')[0]).toBeInTheDocument();
  });

  test('affiche les boutons Valider/Refuser seulement pour les sujets "proposé"', async () => {
    renderPage();
    await waitFor(() => screen.getByText('IA et Machine Learning'));
    // Boutons Valider (FiCheck) et Refuser (FiX) visibles
    const validateBtns = document.querySelectorAll('.btn-success');
    expect(validateBtns.length).toBe(1);
  });

  test('valide un sujet en cliquant sur Valider', async () => {
    api.validateSubject.mockResolvedValueOnce({});
    api.getSubjects.mockResolvedValue({ data: { data: mockSubjects } });
    renderPage();
    await waitFor(() => screen.getByText('IA et Machine Learning'));
    const validateBtn = document.querySelector('.btn-success');
    fireEvent.click(validateBtn);
    await waitFor(() => {
      expect(api.validateSubject).toHaveBeenCalledWith('s1', { statut: 'validé' });
    });
  });

  test('ouvre la modale de refus au clic sur Refuser', async () => {
    renderPage();
    await waitFor(() => screen.getByText('IA et Machine Learning'));
    const refuseBtn = document.querySelector('.btn-danger');
    fireEvent.click(refuseBtn);
    await waitFor(() =>
      expect(screen.getByText('Refuser le sujet')).toBeInTheDocument()
    );
  });

  test('ferme la modale au clic sur Annuler', async () => {
    renderPage();
    await waitFor(() => screen.getByText('IA et Machine Learning'));
    fireEvent.click(document.querySelector('.btn-danger'));
    await waitFor(() => screen.getByText('Refuser le sujet'));
    fireEvent.click(screen.getByText('Annuler'));
    await waitFor(() =>
      expect(screen.queryByText('Refuser le sujet')).not.toBeInTheDocument()
    );
  });

  test('soumet la modale de refus avec un commentaire', async () => {
    api.validateSubject.mockResolvedValueOnce({});
    renderPage();
    await waitFor(() => screen.getByText('IA et Machine Learning'));
    fireEvent.click(document.querySelector('.btn-danger'));
    await waitFor(() => screen.getByText('Refuser le sujet'));
    fireEvent.change(screen.getByPlaceholderText(/Expliquez pourquoi/), {
      target: { value: 'Hors sujet' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Refuser/ })[1]);
    await waitFor(() => {
      expect(api.validateSubject).toHaveBeenCalledWith('s1', {
        statut: 'refusé',
        commentaireAdmin: 'Hors sujet',
      });
    });
  });

  test('supprime un sujet après confirmation', async () => {
    window.confirm = jest.fn(() => true);
    api.deleteSubject.mockResolvedValueOnce({});
    renderPage();
    await waitFor(() => screen.getByText('IA et Machine Learning'));
    const deleteBtns = document.querySelectorAll('.btn-danger');
    // Cliquer sur le dernier bouton de suppression (FiTrash2)
    fireEvent.click(deleteBtns[deleteBtns.length - 1]);
    await waitFor(() => expect(api.deleteSubject).toHaveBeenCalled());
  });

  test('affiche "Aucun sujet" si la liste est vide', async () => {
    api.getSubjects.mockResolvedValueOnce({ data: { data: [] } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Aucun sujet')).toBeInTheDocument());
  });

  test('filtre par recherche', async () => {
    renderPage();
    await waitFor(() => screen.getByText('IA et Machine Learning'));
    fireEvent.change(screen.getByPlaceholderText('Rechercher...'), {
      target: { value: 'React' },
    });
    await waitFor(() => {
      expect(api.getSubjects).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'React' })
      );
    });
  });
});
