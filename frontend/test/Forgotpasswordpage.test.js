import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../src/pages/auth/ForgotPasswordPage';
import * as api from '../src/services/api';

jest.mock('../src/services/api');
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg?.includes?.('React Router')) return;
    console.warn(msg);
  });
});
function renderPage() {
  return render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
}

beforeEach(() => jest.clearAllMocks());

describe('ForgotPasswordPage', () => {
  test('affiche le formulaire de mot de passe oublié', () => {
    renderPage();
    expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument();
    expect(screen.getByText('Envoyer les instructions')).toBeInTheDocument();
  });

  test('affiche le titre', () => {
    renderPage();
    expect(screen.getByText('Mot de passe oublié?')).toBeInTheDocument();
  });

  test('affiche le lien de retour vers la connexion', () => {
    renderPage();
    expect(screen.getByText('Retour à la connexion')).toBeInTheDocument();
  });

  test('met à jour le champ email', () => {
    renderPage();
    const input = screen.getByPlaceholderText('votre@email.com');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  test('appelle l\'API forgotPassword en soumettant', async () => {
    api.forgotPassword.mockResolvedValueOnce({});
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), {
      target: { value: 'jean@test.com' },
    });
    fireEvent.click(screen.getByText('Envoyer les instructions'));

    await waitFor(() => {
      expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'jean@test.com' });
    });
  });

  test('affiche le message de confirmation après succès', async () => {
    api.forgotPassword.mockResolvedValueOnce({});
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), {
      target: { value: 'jean@test.com' },
    });
    fireEvent.click(screen.getByText('Envoyer les instructions'));

    await waitFor(() => {
      expect(screen.getByText('Email envoyé!')).toBeInTheDocument();
    });
  });

  test('affiche toujours le lien de retour après le succès', async () => {
    api.forgotPassword.mockResolvedValueOnce({});
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), {
      target: { value: 'jean@test.com' },
    });
    fireEvent.click(screen.getByText('Envoyer les instructions'));

    await waitFor(() => {
      expect(screen.getByText('Retour à la connexion')).toBeInTheDocument();
    });
  });

  test('affiche une erreur en cas d\'échec', async () => {
    const toast = require('react-hot-toast');
    api.forgotPassword.mockRejectedValueOnce({
      response: { data: { message: 'Email introuvable' } },
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), {
      target: { value: 'inconnu@test.com' },
    });
    fireEvent.click(screen.getByText('Envoyer les instructions'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Email introuvable');
    });
  });

  test('désactive le bouton pendant l\'envoi', async () => {
    api.forgotPassword.mockImplementation(() => new Promise(() => {}));
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('votre@email.com'), {
      target: { value: 'jean@test.com' },
    });
    fireEvent.click(screen.getByText('Envoyer les instructions'));
    await waitFor(() =>
      expect(screen.getByText(/Envoi.../)).toBeDisabled()
    );
  });
});
