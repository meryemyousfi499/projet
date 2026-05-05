import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProfilePage from '../src/pages/shared/ProfilePage';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext');
jest.mock('../src/services/api');
jest.mock('react-hot-toast');
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg?.includes?.('React Router')) return;
    console.warn(msg);
  });
});
const mockUser = {
  _id: 'u1',
  nom: 'Dupont',
  prenom: 'Jean',
  email: 'jean.dupont@test.com',
  role: 'ROLE_STUDENT',
  departement: 'Informatique',
};

const mockUpdateUser = jest.fn();

const renderPage = () => {
  useAuth.mockReturnValue({ user: mockUser, updateUser: mockUpdateUser });
  return render(<MemoryRouter><ProfilePage /></MemoryRouter>);
};

describe('ProfilePage', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders user info correctly', () => {
    renderPage();
    expect(screen.getAllByText('Jean Dupont')[0]).toBeInTheDocument();
    expect(screen.getAllByText('jean.dupont@test.com')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Informatique')[0]).toBeInTheDocument();
  });

  test('displays role badge for ROLE_STUDENT', () => {
    renderPage();
    expect(screen.getByText('Étudiant')).toBeInTheDocument();
  });

  test('displays role badge for ROLE_SUPERVISOR', () => {
    useAuth.mockReturnValue({
      user: { ...mockUser, role: 'ROLE_SUPERVISOR' },
      updateUser: mockUpdateUser,
    });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(screen.getByText('Encadrant')).toBeInTheDocument();
  });

  test('displays role badge for ROLE_ADMIN', () => {
    useAuth.mockReturnValue({
      user: { ...mockUser, role: 'ROLE_ADMIN' },
      updateUser: mockUpdateUser,
    });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(screen.getByText('Administrateur')).toBeInTheDocument();
  });

  test('saves profile and calls updateUser', async () => {
    api.updateProfile.mockResolvedValue({ data: { data: { ...mockUser, nom: 'Martin' } } });
    renderPage();
    const nomInput = screen.getAllByDisplayValue('Dupont')[0];
    fireEvent.change(nomInput, { target: { value: 'Martin' } });
    fireEvent.click(screen.getByText(/Sauvegarder/));
    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Profil mis à jour!');
    });
  });

  test('shows error toast when profile save fails', async () => {
    api.updateProfile.mockRejectedValue(new Error('fail'));
    renderPage();
    fireEvent.click(screen.getByText(/Sauvegarder/));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
  });

  test('rejects password change when passwords do not match', async () => {
    renderPage();
    // Fill password fields via type attribute
    const pwdInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwdInputs[0], { target: { value: 'current' } });
    fireEvent.change(pwdInputs[1], { target: { value: 'newpass1' } });
    fireEvent.change(pwdInputs[2], { target: { value: 'newpass2_different' } });
    fireEvent.submit(document.querySelectorAll('form')[1]);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Les mots de passe ne correspondent pas')
    );
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  test('submits password change when passwords match', async () => {
    api.changePassword.mockResolvedValue({});
    renderPage();
    const pwdInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwdInputs[0], { target: { value: 'current' } });
    fireEvent.change(pwdInputs[1], { target: { value: 'newpass' } });
    fireEvent.change(pwdInputs[2], { target: { value: 'newpass' } });
    fireEvent.submit(document.querySelectorAll('form')[1]);
    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith({ currentPassword: 'current', newPassword: 'newpass' });
      expect(toast.success).toHaveBeenCalledWith('Mot de passe modifié!');
    });
  });

  test('shows API error message on failed password change', async () => {
    api.changePassword.mockRejectedValue({ response: { data: { message: 'Mot de passe incorrect' } } });
    renderPage();
    const pwdInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwdInputs[0], { target: { value: 'wrong' } });
    fireEvent.change(pwdInputs[1], { target: { value: 'newpass' } });
    fireEvent.change(pwdInputs[2], { target: { value: 'newpass' } });
    fireEvent.submit(document.querySelectorAll('form')[1]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Mot de passe incorrect'));
  });

  test('shows avatar initials', () => {
    renderPage();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});






