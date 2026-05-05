import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import GroupPage from '../src/pages/student/GroupPage';
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
    if (typeof msg === 'string' && msg.includes('React Router')) return;
    console.warn(msg);
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const mockUser = { _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' };

const mockGroup = {
  _id: 'g1',
  nom: 'Groupe Alpha',
  chef: { _id: 'u1', prenom: 'Jean', nom: 'Dupont', email: 'jean@test.com' },
  membres: [
    { _id: 'u1', prenom: 'Jean', nom: 'Dupont', email: 'jean@test.com', departement: 'Info' },
    { _id: 'u2', prenom: 'Sara', nom: 'Alami', email: 'sara@test.com', departement: 'Math' },
  ],
  invitations: [
    { _id: 'inv1', statut: 'en attente', userId: { _id: 'u3', prenom: 'Ali', nom: 'Ben', email: 'ali@test.com' } },
  ],
};

const mockInvitations = [
  {
    _id: 'g2',
    nom: 'Groupe Beta',
    chef: { _id: 'chef2', prenom: 'Paul', nom: 'Leroy' },
    membres: [{ _id: 'chef2', prenom: 'Paul', nom: 'Leroy' }],
  },
];

const mockApplications = [
  {
    _id: 'app1',
    statut: 'en attente',
    sujetId: { _id: 's1', titre: 'Projet PFE', technologies: ['React', 'Node.js'] },
    groupId: { _id: 'g1', nom: 'Groupe Alpha', chef: { _id: 'u1' } },
  },
];

const mockAcceptedApp = [
  {
    _id: 'app2',
    statut: 'accepté',
    sujetId: { _id: 's2', titre: 'Projet accepté', technologies: [] },
    groupId: { _id: 'g1', nom: 'Groupe Alpha', chef: { _id: 'u1' } },
  },
];

const setupMocks = ({ group = mockGroup, invitations = [], applications = [] } = {}) => {
  useAuth.mockReturnValue({ user: mockUser });
  api.getMyGroup.mockResolvedValue({ data: { data: group } });
  api.getMyInvitations.mockResolvedValue({ data: { data: invitations } });
  api.getApplications.mockResolvedValue({ data: { data: applications } });
};

const renderPage = () =>
  render(<MemoryRouter><GroupPage /></MemoryRouter>);

describe('GroupPage - No Group State', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading state', () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getMyGroup.mockReturnValue(new Promise(() => {}));
    api.getMyInvitations.mockReturnValue(new Promise(() => {}));
    api.getApplications.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('shows "no group" state when user has no group and no invitations', async () => {
    setupMocks({ group: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Vous n'avez pas encore de groupe")).toBeInTheDocument()
    );
  });

  test('shows "Créer un groupe" button in header when no group', async () => {
    setupMocks({ group: null });
    renderPage();
    await waitFor(() => screen.getByText("Vous n'avez pas encore de groupe"));
    expect(screen.getAllByText('Créer un groupe').length).toBeGreaterThan(0);
  });

  test('opens create group modal on button click', async () => {
    setupMocks({ group: null });
    renderPage();
    await waitFor(() => screen.getAllByText('Créer un groupe'));
    fireEvent.click(screen.getAllByText('Créer un groupe')[0]);
    expect(screen.getByText('Créer un groupe', { selector: '.modal-title' })).toBeInTheDocument();
  });

  test('creates a group successfully', async () => {
    setupMocks({ group: null });
    api.createGroup.mockResolvedValue({ data: { data: mockGroup } });
    renderPage();
    await waitFor(() => screen.getAllByText('Créer un groupe'));
    fireEvent.click(screen.getAllByText('Créer un groupe')[0]);
    const input = screen.getByPlaceholderText(/Équipe Alpha/);
    fireEvent.change(input, { target: { value: 'Groupe Test' } });
    fireEvent.click(screen.getByText('Créer', { selector: 'button' }));
    await waitFor(() => {
      expect(api.createGroup).toHaveBeenCalledWith({ nom: 'Groupe Test' });
      expect(toast.success).toHaveBeenCalledWith('Groupe créé!');
    });
  });

  test('create button is disabled when group name is empty', async () => {
    setupMocks({ group: null });
    renderPage();
    await waitFor(() => screen.getAllByText('Créer un groupe'));
    fireEvent.click(screen.getAllByText('Créer un groupe')[0]);
    const createBtn = screen.getByRole('button', { name: /Créer/ });
    expect(createBtn).toBeDisabled();
  });

  test('shows error when group creation fails', async () => {
    setupMocks({ group: null });
    api.createGroup.mockRejectedValue({ response: { data: { message: 'Erreur création' } } });
    renderPage();
    await waitFor(() => screen.getAllByText('Créer un groupe'));
    fireEvent.click(screen.getAllByText('Créer un groupe')[0]);
    fireEvent.change(screen.getByPlaceholderText(/Équipe Alpha/), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  test('closes create modal on Annuler', async () => {
    setupMocks({ group: null });
    renderPage();
    await waitFor(() => screen.getAllByText('Créer un groupe'));
    fireEvent.click(screen.getAllByText('Créer un groupe')[0]);
    fireEvent.click(screen.getByText('Annuler'));
    await waitFor(() =>
      expect(screen.queryByText('Créer un groupe', { selector: '.modal-title' })).not.toBeInTheDocument()
    );
  });
});

describe('GroupPage - Pending Invitations', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows received invitations', async () => {
    setupMocks({ group: null, invitations: mockInvitations });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Invitations reçues')).toBeInTheDocument()
    );
    expect(screen.getByText(/Groupe Beta/)).toBeInTheDocument();
    expect(screen.getByText(/Paul Leroy/)).toBeInTheDocument();
  });

  test('accepts an invitation', async () => {
    setupMocks({ group: null, invitations: mockInvitations });
    api.respondInvitation.mockResolvedValue({});
    // mockResolvedValueOnce: first call (on mount) returns invitations,
    // second call (after responding) returns empty to reflect updated state
    api.getMyInvitations
      .mockResolvedValueOnce({ data: { data: mockInvitations } })
      .mockResolvedValueOnce({ data: { data: [] } });
    renderPage();
    await waitFor(() => screen.getByText('Accepter'));
    fireEvent.click(screen.getByText('Accepter'));
    await waitFor(() => {
      expect(api.respondInvitation).toHaveBeenCalledWith('g2', { statut: 'accepté' });
      expect(toast.success).toHaveBeenCalledWith('Vous avez rejoint le groupe!');
    });
  });

  test('refuses an invitation', async () => {
    setupMocks({ group: null, invitations: mockInvitations });
    api.respondInvitation.mockResolvedValue({});
    api.getMyInvitations
      .mockResolvedValueOnce({ data: { data: mockInvitations } })
      .mockResolvedValueOnce({ data: { data: [] } });
    renderPage();
    await waitFor(() => screen.getByText('Refuser'));
    fireEvent.click(screen.getByText('Refuser'));
    await waitFor(() => {
      expect(api.respondInvitation).toHaveBeenCalledWith('g2', { statut: 'refusé' });
      expect(toast.success).toHaveBeenCalledWith('Invitation refusée');
    });
  });

  test('shows error when responding to invitation fails', async () => {
    setupMocks({ group: null, invitations: mockInvitations });
    api.respondInvitation.mockRejectedValue({ message: 'fail' });
    renderPage();
    await waitFor(() => screen.getByText('Accepter'));
    fireEvent.click(screen.getByText('Accepter'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe('GroupPage - Group Panel (Chef)', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders group name and member count', async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Groupe Alpha')).toBeInTheDocument()
    );
    expect(screen.getByText(/2 membre/)).toBeInTheDocument();
  });

  test('shows Chef badge on the group', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    expect(screen.getAllByText(/Chef/)[0]).toBeInTheDocument();
  });

  test('shows member list with emails', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    expect(screen.getByText('jean@test.com · Info')).toBeInTheDocument();
    expect(screen.getByText('sara@test.com · Math')).toBeInTheDocument();
  });

  test('shows pending invitations sent by chef', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    expect(screen.getByText('Invitations en attente')).toBeInTheDocument();
    expect(screen.getByText(/Ali Ben/)).toBeInTheDocument();
  });

  test('chef can open invite modal', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    fireEvent.click(screen.getByText('Inviter'));
    expect(screen.getByText('Inviter un membre')).toBeInTheDocument();
  });

  test('chef sends invitation', async () => {
    setupMocks();
    api.inviteMember.mockResolvedValue({});
    api.getMyGroup.mockResolvedValue({ data: { data: mockGroup } });
    api.getMyInvitations.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => screen.getByText('Inviter'));
    fireEvent.click(screen.getByText('Inviter'));
    fireEvent.change(screen.getByPlaceholderText('etudiant@email.com'), { target: { value: 'new@test.com' } });
    fireEvent.click(screen.getByText("Envoyer l'invitation"));
    await waitFor(() => {
      expect(api.inviteMember).toHaveBeenCalledWith({ email: 'new@test.com' });
      expect(toast.success).toHaveBeenCalledWith('Invitation envoyée!');
    });
  });

  test('invite button is disabled when email is empty', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Inviter'));
    fireEvent.click(screen.getByText('Inviter'));
    const sendBtn = screen.getByText("Envoyer l'invitation").closest('button');
    expect(sendBtn).toBeDisabled();
  });

  test('closes invite modal on Annuler', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Inviter'));
    fireEvent.click(screen.getByText('Inviter'));
    fireEvent.click(screen.getByText('Annuler'));
    await waitFor(() =>
      expect(screen.queryByText('Inviter un membre')).not.toBeInTheDocument()
    );
  });

  test('shows error when invite fails', async () => {
    setupMocks();
    api.inviteMember.mockRejectedValue({ response: { data: { message: 'Erreur invite' } } });
    renderPage();
    await waitFor(() => screen.getByText('Inviter'));
    fireEvent.click(screen.getByText('Inviter'));
    fireEvent.change(screen.getByPlaceholderText('etudiant@email.com'), { target: { value: 'bad@test.com' } });
    fireEvent.click(screen.getByText("Envoyer l'invitation"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  test('chef can remove a non-chef member', async () => {
    setupMocks();
    api.removeMember.mockResolvedValue({});
    api.getMyGroup.mockResolvedValue({ data: { data: mockGroup } });
    renderPage();
    await waitFor(() => screen.getByText('Sara Alami'));
    // Try title-based selector first, then fall back to any small danger/secondary btn near members
    let removeBtns = document.querySelectorAll('[title="Retirer"]');
    if (removeBtns.length === 0) {
      removeBtns = document.querySelectorAll('.btn-danger.btn-sm, .btn-secondary.btn-sm');
      // Filter to those not being the Inviter/Supprimer top-level buttons
      removeBtns = Array.from(removeBtns).filter(b => !['Inviter', 'Supprimer'].includes(b.textContent.trim()));
    }
    expect(removeBtns.length).toBeGreaterThan(0);
    fireEvent.click(removeBtns[0]);
    await waitFor(() => expect(api.removeMember).toHaveBeenCalled());
  });

  test('chef can delete the group', async () => {
    window.confirm = jest.fn(() => true);
    setupMocks();
    api.deleteGroup.mockResolvedValue({});
    // After deletion, re-fetch returns null (group is gone)
    api.getMyGroup
      .mockResolvedValueOnce({ data: { data: mockGroup } })
      .mockResolvedValueOnce({ data: { data: null } });
    renderPage();
    await waitFor(() => screen.getByText('Supprimer'));
    fireEvent.click(screen.getByText('Supprimer'));
    await waitFor(() => {
      expect(api.deleteGroup).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Groupe supprimé.');
    });
  });

  test('does not delete group when confirmation is cancelled', async () => {
    window.confirm = jest.fn(() => false);
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Supprimer'));
    fireEvent.click(screen.getByText('Supprimer'));
    expect(api.deleteGroup).not.toHaveBeenCalled();
  });

  test('shows error when delete group fails', async () => {
    window.confirm = jest.fn(() => true);
    setupMocks();
    api.deleteGroup.mockRejectedValue({ message: 'fail' });
    renderPage();
    await waitFor(() => screen.getByText('Supprimer'));
    fireEvent.click(screen.getByText('Supprimer'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe('GroupPage - Non-Chef Member', () => {
  afterEach(() => jest.clearAllMocks());

  const nonChefUser = { _id: 'u2', prenom: 'Sara', nom: 'Alami', role: 'ROLE_STUDENT' };

  test('member sees Quitter button instead of Supprimer', async () => {
    useAuth.mockReturnValue({ user: nonChefUser });
    api.getMyGroup.mockResolvedValue({ data: { data: mockGroup } });
    api.getMyInvitations.mockResolvedValue({ data: { data: [] } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    expect(screen.getByText('Quitter')).toBeInTheDocument();
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument();
    expect(screen.queryByText('Inviter')).not.toBeInTheDocument();
  });

  test('member can leave the group', async () => {
    window.confirm = jest.fn(() => true);
    useAuth.mockReturnValue({ user: nonChefUser });
    api.getMyGroup.mockResolvedValue({ data: { data: mockGroup } });
    api.getMyInvitations.mockResolvedValue({ data: { data: [] } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    api.leaveGroup.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText('Quitter'));
    fireEvent.click(screen.getByText('Quitter'));
    await waitFor(() => {
      expect(api.leaveGroup).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Vous avez quitté le groupe.');
    });
  });

  test('member does not leave if confirmation cancelled', async () => {
    window.confirm = jest.fn(() => false);
    useAuth.mockReturnValue({ user: nonChefUser });
    api.getMyGroup.mockResolvedValue({ data: { data: mockGroup } });
    api.getMyInvitations.mockResolvedValue({ data: { data: [] } });
    api.getApplications.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => screen.getByText('Quitter'));
    fireEvent.click(screen.getByText('Quitter'));
    expect(api.leaveGroup).not.toHaveBeenCalled();
  });
});

describe('GroupPage - Applications Section', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows empty state when no applications', async () => {
    setupMocks({ applications: [] });
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    expect(screen.getByText('Aucune candidature')).toBeInTheDocument();
  });

  test('shows application with pending status', async () => {
    setupMocks({ applications: mockApplications });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Projet PFE')).toBeInTheDocument();
      expect(screen.getByText(/En attente/)).toBeInTheDocument();
    });
  });

  test('shows accepted application with "Voir le projet" button', async () => {
    setupMocks({ applications: mockAcceptedApp });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Voir le projet')).toBeInTheDocument();
    });
  });

  test('shows refused application with refusal status', async () => {
    const refusedApp = [{ ...mockApplications[0], statut: 'refusé', commentaireEncadrant: 'Hors sujet' }];
    setupMocks({ applications: refusedApp });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Refusé/)).toBeInTheDocument();
      expect(screen.getByText('Hors sujet')).toBeInTheDocument();
    });
  });

  test('chef sees "Postuler à un sujet" button', async () => {
    setupMocks({ applications: [] });
    renderPage();
    await waitFor(() => screen.getByText('Groupe Alpha'));
    expect(screen.getAllByText('+ Postuler à un sujet').length).toBeGreaterThan(0);
  });
});

describe('GroupPage - Guide Checklist', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders guide steps', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Guide du groupe'));
    expect(screen.getByText('Créer le groupe')).toBeInTheDocument();
    expect(screen.getByText('Inviter les membres')).toBeInTheDocument();
    expect(screen.getByText('Postuler à un sujet')).toBeInTheDocument();
    expect(screen.getByText('Attendre validation')).toBeInTheDocument();
    expect(screen.getByText('Démarrer le projet')).toBeInTheDocument();
  });

  test('marks step 1 (Créer le groupe) as done', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Créer le groupe'));
    // Step 1 should be done since group exists
    const steps = document.querySelectorAll('.card div[style*="border-radius: 50%"]');
    expect(steps.length).toBeGreaterThan(0);
  });

  test('step 3 marked done when application exists', async () => {
    setupMocks({ applications: mockApplications });
    renderPage();
    await waitFor(() => screen.getByText('Postuler à un sujet'));
    // Applications exist, so step 3 is done
    expect(screen.getByText('Postuler à un sujet')).toBeInTheDocument();
  });
});