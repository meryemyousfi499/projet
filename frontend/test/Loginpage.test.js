import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../src/pages/auth/LoginPage';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/services/api');
jest.mock('../src/context/AuthContext');
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
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

const mockLogin = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ login: mockLogin });
});

function renderLogin() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('LoginPage', () => {
  test('affiche les champs email et mot de passe', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
  });

  test('affiche le bouton de connexion', () => {
    renderLogin();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('affiche le lien "Mot de passe oublié"', () => {
    renderLogin();
    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
  });

  test('affiche le lien d\'inscription', () => {
    renderLogin();
    expect(screen.getByText('S\'inscrire')).toBeInTheDocument();
  });

  test('met à jour le champ email', () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  test('bascule la visibilité du mot de passe', () => {
    renderLogin();
    const pwdInput = screen.getByPlaceholderText('••••••••••••');
    expect(pwdInput.type).toBe('password');
    const toggleBtn = pwdInput.parentElement.querySelector('button');
    fireEvent.click(toggleBtn);
    expect(pwdInput.type).toBe('text');
    fireEvent.click(toggleBtn);
    expect(pwdInput.type).toBe('password');
  });

  test('appelle l\'API de login et redirige en cas de succès', async () => {
    api.login.mockResolvedValueOnce({
      data: { token: 'tok', user: { _id: '1', prenom: 'Jean' } },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'jean@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({ email: 'jean@test.com', motDePasse: 'password123' });
      expect(mockLogin).toHaveBeenCalledWith('tok', { _id: '1', prenom: 'Jean' });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('affiche une erreur en cas d\'échec de connexion', async () => {
    const toast = require('react-hot-toast');
    api.login.mockRejectedValueOnce({
      response: { data: { message: 'Identifiants invalides' } },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Identifiants invalides');
    });
  });

  test('désactive le bouton pendant le chargement', async () => {
    api.login.mockImplementation(() => new Promise(() => {}));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'j@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() =>
      expect(screen.getByText(/Connexion.../)).toBeDisabled()
    );
  });
});
