import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import * as api from '../src/services/api';

jest.mock('../src/services/api');

// Composant consommateur de test
function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <div>Chargement...</div>;
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button onClick={() => login('token123', { _id: '1', prenom: 'Jean' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('fournit user=null et loading=false par défaut (pas de token)', async () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('null'));
  });

  test('charge l\'utilisateur depuis localStorage au démarrage', async () => {
    const savedUser = { _id: '1', prenom: 'Jean', nom: 'Dupont' };
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify(savedUser));
    api.getMe.mockResolvedValueOnce({ data: { data: savedUser } });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('Jean')
    );
  });

  test('se déconnecte si getMe échoue', async () => {
    localStorage.setItem('token', 'tok_invalide');
    localStorage.setItem('user', JSON.stringify({ _id: '1', prenom: 'Jean' }));
    api.getMe.mockRejectedValueOnce(new Error('Unauthorized'));

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    );
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('login enregistre le token et l\'utilisateur', async () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => screen.getByTestId('user'));

    act(() => {
      screen.getByText('Login').click();
    });

    expect(localStorage.getItem('token')).toBe('token123');
    expect(localStorage.getItem('user')).toContain('Jean');
    expect(screen.getByTestId('user')).toHaveTextContent('Jean');
  });

  test('logout supprime le token et l\'utilisateur', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ _id: '1', prenom: 'Jean' }));
    api.getMe.mockResolvedValueOnce({ data: { data: { _id: '1', prenom: 'Jean' } } });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => screen.getByTestId('user'));

    act(() => {
      screen.getByText('Logout').click();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  test('useAuth lève une erreur hors du AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
    consoleError.mockRestore();
  });

  test('affiche "Chargement..." pendant la vérification du token', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ _id: '1' }));
    api.getMe.mockImplementation(() => new Promise(() => {})); // jamais résolu

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });
});
