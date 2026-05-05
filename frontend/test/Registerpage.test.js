import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../src/pages/auth/RegisterPage';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import toast from 'react-hot-toast';

jest.mock('../src/services/api');
jest.mock('../src/context/AuthContext');
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockLogin = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ login: mockLogin });
});

function renderRegister() {
  return render(<MemoryRouter><RegisterPage /></MemoryRouter>);
}

describe('RegisterPage', () => {
  test('affiche tous les champs du formulaire', () => {
    renderRegister();
    expect(screen.getByPlaceholderText('Prénom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ex: Informatique')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min. 6 caractères')).toBeInTheDocument();
  });

  test('affiche le bouton de soumission', () => {
    renderRegister();
    expect(screen.getByText('Créer mon compte')).toBeInTheDocument();
  });

  test('affiche l\'information sur le rôle Étudiant', () => {
    renderRegister();
    expect(screen.getByText(/Vous vous inscrivez en tant qu'Étudiant/)).toBeInTheDocument();
  });

  test('affiche le lien de connexion', () => {
    renderRegister();
    expect(screen.getByText('Se connecter')).toBeInTheDocument();
  });

  test('met à jour les champs du formulaire', () => {
    renderRegister();
    const prenomInput = screen.getByPlaceholderText('Prénom');
    fireEvent.change(prenomInput, { target: { value: 'Alice' } });
    expect(prenomInput.value).toBe('Alice');
  });

  test('bascule la visibilité du mot de passe', () => {
    renderRegister();
    const pwdInput = screen.getByPlaceholderText('Min. 6 caractères');
    expect(pwdInput.type).toBe('password');
    const toggleBtn = pwdInput.parentElement.querySelector('button');
    fireEvent.click(toggleBtn);
    expect(pwdInput.type).toBe('text');
  });

  test('soumet le formulaire avec les bonnes données', async () => {
    api.register.mockResolvedValueOnce({
      data: { token: 'tok', user: { _id: '1', prenom: 'Alice' } },
    });
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText('Prénom'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText('Nom'), { target: { value: 'Martin' } });
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'alice@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Min. 6 caractères'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Créer mon compte'));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith(
        expect.objectContaining({ prenom: 'Alice', nom: 'Martin', email: 'alice@test.com' })
      );
      expect(mockLogin).toHaveBeenCalledWith('tok', { _id: '1', prenom: 'Alice' });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('affiche une erreur en cas d\'échec', async () => {
    api.register.mockRejectedValue({ 
      response: { data: { message: 'Email déjà utilisé' } } 
    });
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('Prénom'), { target: { value: 'Claire' } });
    fireEvent.change(screen.getByPlaceholderText('Nom'), { target: { value: 'Martin' } });
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'claire@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Min. 6 caractères'), { target: { value: 'password123' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  test('désactive le bouton pendant la soumission', async () => {
    api.register.mockImplementation(() => new Promise(() => {}));
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('Prénom'), { target: { value: 'Claire' } });
    fireEvent.change(screen.getByPlaceholderText('Nom'), { target: { value: 'Martin' } });
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'claire@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Min. 6 caractères'), { target: { value: 'password123' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() =>
      expect(document.querySelector('.auth-submit')).toBeDisabled()
    );
  });
});




