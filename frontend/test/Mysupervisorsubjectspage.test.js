import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import MySupervisorSubjectsPage from '../src/pages/supervisor/MySupervisorSubjectsPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast');

const mockSubjects = [
  {
    _id: 's1',
    titre: 'Sujet IA',
    description: 'Utilisation du machine learning pour la détection d\'anomalies.',
    technologies: ['Python', 'TensorFlow'],
    statut: 'validé',
    nombreMaxEtudiants: 2,
    nombreCandidatures: 3,
  },
  {
    _id: 's2',
    titre: 'Sujet Web',
    description: 'Application web complète.',
    technologies: ['React', 'Node.js'],
    statut: 'proposé',
    nombreMaxEtudiants: 3,
    nombreCandidatures: 0,
    commentaireAdmin: 'Veuillez détailler la méthodologie.',
  },
];

const renderPage = () =>
  render(<MemoryRouter><MySupervisorSubjectsPage /></MemoryRouter>);

describe('MySupervisorSubjectsPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading state', () => {
    api.getMySubjects.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('renders list of subjects', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: mockSubjects } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sujet IA')).toBeInTheDocument();
      expect(screen.getByText('Sujet Web')).toBeInTheDocument();
    });
  });

  test('shows admin comment when present', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: mockSubjects } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Veuillez détailler la méthodologie/)).toBeInTheDocument()
    );
  });

  test('shows empty state with create button', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aucun sujet proposé')).toBeInTheDocument();
      expect(screen.getAllByText('Proposer un sujet').length).toBeGreaterThan(0);
    });
  });

  test('opens create modal on button click', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: mockSubjects } });
    renderPage();
    await waitFor(() => screen.getByText('Sujet IA'));
    fireEvent.click(screen.getByText('Proposer un sujet'));
    expect(screen.getByText('Proposer un sujet', { selector: '.modal-title' })).toBeInTheDocument();
  });

  test('creates a new subject', async () => {
    api.getMySubjects
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [mockSubjects[0]] } });
    api.createSubject.mockResolvedValue({ data: { data: mockSubjects[0] } });
    renderPage();
    await waitFor(() => screen.getByText('Proposer un sujet'));
    fireEvent.click(screen.getAllByText('Proposer un sujet')[0]);

    fireEvent.change(document.querySelectorAll('.form-input')[0], { target: { value: 'Nouveau sujet' } });
    fireEvent.change(document.querySelectorAll('.form-textarea')[0], { target: { value: 'Description du nouveau sujet' } });
    fireEvent.click(screen.getByText('Soumettre'));

    await waitFor(() => {
      expect(api.createSubject).toHaveBeenCalledWith(
        expect.objectContaining({ titre: 'Nouveau sujet' })
      );
      expect(toast.success).toHaveBeenCalledWith('Sujet proposé! En attente de validation.');
    });
  });

  test('opens edit modal with pre-filled data', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: mockSubjects } });
    renderPage();
    await waitFor(() => screen.getByText('Sujet IA'));
    const editButtons = screen.getAllByTitle
      ? screen.getAllByRole('button', { name: '' })
      : document.querySelectorAll('.btn-secondary.btn-sm');
    // Click first edit icon button
    const allSmallBtns = document.querySelectorAll('.btn-secondary.btn-sm');
    fireEvent.click(allSmallBtns[0]);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sujet IA')).toBeInTheDocument();
    });
  });

  test('updates an existing subject', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: mockSubjects } });
    api.updateSubject.mockResolvedValue({ data: { data: mockSubjects[0] } });
    renderPage();
    await waitFor(() => screen.getByText('Sujet IA'));
    const editBtns = document.querySelectorAll('.btn-secondary.btn-sm');
    fireEvent.click(editBtns[0]);
    await waitFor(() => screen.getByDisplayValue('Sujet IA'));
    fireEvent.change(screen.getByDisplayValue('Sujet IA'), { target: { value: 'Sujet IA modifié' } });
    fireEvent.click(screen.getByText('Soumettre'));
    await waitFor(() => {
      expect(api.updateSubject).toHaveBeenCalledWith('s1', expect.objectContaining({ titre: 'Sujet IA modifié' }));
      expect(toast.success).toHaveBeenCalledWith('Sujet modifié!');
    });
  });

  test('deletes a subject after confirmation', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: mockSubjects } });
    api.deleteSubject.mockResolvedValue({});
    window.confirm = jest.fn(() => true);
    renderPage();
    await waitFor(() => screen.getByText('Sujet IA'));
    const deleteBtns = document.querySelectorAll('.btn-danger.btn-sm');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(api.deleteSubject).toHaveBeenCalledWith('s1');
      expect(toast.success).toHaveBeenCalledWith('Supprimé');
    });
  });

  test('does not delete when confirmation is cancelled', async () => {
    api.getMySubjects.mockResolvedValue({ data: { data: mockSubjects } });
    window.confirm = jest.fn(() => false);
    renderPage();
    await waitFor(() => screen.getByText('Sujet IA'));
    const deleteBtns = document.querySelectorAll('.btn-danger.btn-sm');
    fireEvent.click(deleteBtns[0]);
    expect(api.deleteSubject).not.toHaveBeenCalled();
  });

  test('converts comma-separated technologies to array on save', async () => {
    api.getMySubjects.mockResolvedValueOnce({ data: { data: [] } }).mockResolvedValueOnce({ data: { data: [] } });
    api.createSubject.mockResolvedValue({ data: { data: {} } });
    renderPage();
    await waitFor(() => screen.getByText('Proposer un sujet'));
    fireEvent.click(screen.getAllByText('Proposer un sujet')[0]);
    fireEvent.change(document.querySelectorAll('.form-input')[0], { target: { value: 'T' } });
    fireEvent.change(document.querySelectorAll('.form-textarea')[0], { target: { value: 'D' } });
    fireEvent.change(screen.getByPlaceholderText(/React, Node.js/), { target: { value: 'React, Node.js , MongoDB' } });
    fireEvent.click(screen.getByText('Soumettre'));
    await waitFor(() => {
      expect(api.createSubject).toHaveBeenCalledWith(
        expect.objectContaining({ technologies: ['React', 'Node.js', 'MongoDB'] })
      );
    });
  });
});


