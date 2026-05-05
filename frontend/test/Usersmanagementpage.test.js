import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor,act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersManagementPage from '../src/pages/admin/UsersManagementPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

const mockUsers = [
  { _id: 'u1', prenom: 'Alice', nom: 'Martin', email: 'alice@test.com', role: 'ROLE_STUDENT', departement: 'Info', statut: 'actif' },
  { _id: 'u2', prenom: 'Paul', nom: 'Durand', email: 'paul@test.com', role: 'ROLE_SUPERVISOR', departement: 'Math', statut: 'inactif' },
];

function renderPage() {
  return render(<MemoryRouter><UsersManagementPage /></MemoryRouter>);
}

describe('UsersManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getUsers.mockResolvedValue({ data: { data: mockUsers, total: 2 } });
  });

  test('affiche un spinner pendant le chargement', () => {
    api.getUsers.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('affiche les utilisateurs après chargement', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice Martin')).toBeInTheDocument());
    expect(screen.getByText('Paul Durand')).toBeInTheDocument();
  });

  test('affiche les emails', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument());
  });

  test('affiche les rôles', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/tudiant/)[0]).toBeInTheDocument());
    expect(screen.getAllByText(/tudiant/)[0]).toBeInTheDocument();;
  });

  test('affiche les statuts', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('actif')).toBeInTheDocument());
    expect(screen.getByText('inactif')).toBeInTheDocument();
  });

  test('affiche le bouton "Nouvel utilisateur"', async () => {
    renderPage();
    expect(screen.getByText('Nouvel utilisateur')).toBeInTheDocument();
  });

  test('ouvre la modale de création au clic sur Nouvel utilisateur', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Nouvel utilisateur'));
    await waitFor(() => expect(screen.getByText('Créer un utilisateur')).toBeInTheDocument());
  });

  test('ouvre la modale de modification au clic sur Modifier', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    const editBtns = document.querySelectorAll('.btn-secondary');
    fireEvent.click(editBtns[0]);
    await waitFor(() => expect(screen.getByText('Modifier un utilisateur')).toBeInTheDocument());
  });

  test('pré-remplit les champs en mode édition', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    const editBtns = document.querySelectorAll('.btn-secondary');
    fireEvent.click(editBtns[0]);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Martin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('alice@test.com')).toBeInTheDocument();
    });
  });

  test('crée un utilisateur', async () => {
    api.createUser.mockResolvedValueOnce({});
    renderPage();
    fireEvent.click(screen.getByText('Nouvel utilisateur'));
    await waitFor(() => screen.getByText('Créer un utilisateur'));

    fireEvent.change(document.querySelectorAll('.modal .form-input')[0], { target: { value: 'Claire' } });
    fireEvent.submit(document.querySelector('.modal form'));

    await waitFor(() => expect(api.createUser).toHaveBeenCalled());
  });

  test('supprime un utilisateur après confirmation', async () => {
    window.confirm = jest.fn(() => true);
    api.deleteUser.mockResolvedValueOnce({});
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    const deleteBtns = document.querySelectorAll('.btn-danger');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith('u1'));
  });

  test('ne supprime pas si l\'utilisateur annule la confirmation', async () => {
    window.confirm = jest.fn(() => false);
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    fireEvent.click(document.querySelectorAll('.btn-danger')[0]);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  test('bascule le statut d\'un utilisateur', async () => {
    api.toggleUserStatus.mockResolvedValueOnce({ data: { data: { statut: 'inactif' } } });
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    const toggleBtns = document.querySelectorAll('[title="Activer/Désactiver"]');
    fireEvent.click(toggleBtns[0]);
    await waitFor(() => expect(api.toggleUserStatus).toHaveBeenCalledWith('u1'));
  });

  test('affiche la pagination quand total > 10', async () => {
    api.getUsers.mockResolvedValue({ data: { data: mockUsers, total: 25 } });
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    // 3 pages pour 25 éléments avec limit=10
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('n\'affiche pas la pagination quand total <= 10', async () => {
    api.getUsers.mockResolvedValue({ data: { data: mockUsers, total: 2 } });
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    expect(screen.queryByText('2')).toBeNull();
  });

  test('filtre par rôle au changement du select', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ROLE_STUDENT' } });
    await waitFor(() => {
      expect(api.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ROLE_STUDENT' })
      );
    });
  });

  test('recherche par texte', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice Martin'));
    const searchInput = screen.getByPlaceholderText('Rechercher...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    await waitFor(() => {
      expect(api.getUsers).toHaveBeenCalledWith(
       expect.objectContaining({ search: 'Alice' })
      );
    });
  });

  test('affiche le total d\'utilisateurs', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('2 utilisateur(s) au total')).toBeInTheDocument());
  });
});


