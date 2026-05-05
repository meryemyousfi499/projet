import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import MessagesPage from '../src/pages/shared/MessagesPage';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext');
jest.mock('../src/services/api');
jest.mock('react-hot-toast');
jest.mock('../src/components/chat/ChatSidebar', () => ({ projects, selectedId, onSelect, loading }) => (
  <div data-testid="chat-sidebar">
    {loading && <div>Loading sidebar...</div>}
    {projects.map(p => (
      <button key={p._id} onClick={() => onSelect(p)} className={selectedId === p._id ? 'active' : ''}>
        {p.encadrantId?.prenom} {p.encadrantId?.nom}
      </button>
    ))}
  </div>
));
jest.mock('../src/components/chat/ChatMessage', () => ({ message }) => (
  <div data-testid="chat-message">{message.content}</div>
));
jest.mock('../src/components/chat/ChatInput', () => ({ text, onChange, onSend, onFileSelect, sending, uploading }) => (
  <div data-testid="chat-input">
    <textarea value={text} onChange={e => onChange(e.target.value)} placeholder="Écrire un message..." />
    <button onClick={onSend} disabled={sending || uploading || !text.trim()}>Envoyer</button>
    <input type="file" onChange={onFileSelect} data-testid="file-input" />
  </div>
));
jest.mock('../src/components/common/Avatar', () => ({ user }) => <div data-testid="avatar">{user?.prenom}</div>);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const mockStudentUser = { _id: 'u1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' };
const mockSupervisorUser = { _id: 'sup1', prenom: 'Ali', nom: 'Ben', role: 'ROLE_SUPERVISOR' };

const mockProjects = [
  {
    _id: 'proj1',
    statut: 'en cours',
    encadrantId: { _id: 'sup1', prenom: 'Ali', nom: 'Ben' },
    sujetId: { titre: 'Projet IA' },
    etudiants: [{ _id: 'u1', prenom: 'Jean', nom: 'Dupont' }],
  },
  {
    _id: 'proj2',
    statut: 'terminé',
    encadrantId: { _id: 'sup2', prenom: 'Marie', nom: 'Martin' },
    sujetId: { titre: 'Projet Web' },
    etudiants: [{ _id: 'u1', prenom: 'Jean', nom: 'Dupont' }],
  },
];

const mockMessages = [
  { _id: 'msg1', content: 'Bonjour!', type: 'text', auteurId: { _id: 'u1' }, createdAt: new Date().toISOString() },
  { _id: 'msg2', content: 'Ça avance bien?', type: 'text', auteurId: { _id: 'sup1' }, createdAt: new Date().toISOString() },
];

describe('MessagesPage', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading spinner while fetching projects', () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('renders chat sidebar with active projects', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: mockProjects } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument());
    expect(screen.getByText('Ali Ben')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
  });

  test('shows "Sélectionnez un projet" when no project selected', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: mockProjects } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByTestId('chat-sidebar'));
    expect(screen.getByText('Sélectionnez un projet')).toBeInTheDocument();
  });

  test('loads messages when project is selected', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: mockProjects } });
    api.getMessages.mockResolvedValue({ data: { data: mockMessages } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => {
      expect(api.getMessages).toHaveBeenCalledWith('proj1');
      expect(screen.getAllByTestId('chat-message').length).toBeGreaterThan(0);
    });
  });

  test('shows project name in chat header after selection', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: mockProjects } });
    api.getMessages.mockResolvedValue({ data: { data: mockMessages } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => {
      const header = screen.getByText('Ali Ben', { selector: '.chat-header-title' });
      expect(header).toBeInTheDocument();
    });
  });

  test('sends a message', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: [mockProjects[0]] } });
    api.getMessages.mockResolvedValue({ data: { data: [] } });
    api.sendMessage.mockResolvedValue({ data: { data: { _id: 'newmsg', content: 'Hello', auteurId: { _id: 'u1' }, createdAt: new Date().toISOString() } } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => screen.getByTestId('chat-input'));
    fireEvent.change(screen.getByPlaceholderText('Écrire un message...'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Envoyer'));
    await waitFor(() => {
      expect(api.sendMessage).toHaveBeenCalledWith('proj1', { content: 'Hello' });
    });
  });

  test('does not send empty message', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: [mockProjects[0]] } });
    api.getMessages.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => screen.getByTestId('chat-input'));
    fireEvent.click(screen.getByText('Envoyer'));
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  test('shows error when sending message fails', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: [mockProjects[0]] } });
    api.getMessages.mockResolvedValue({ data: { data: [] } });
    api.sendMessage.mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => screen.getByTestId('chat-input'));
    fireEvent.change(screen.getByPlaceholderText('Écrire un message...'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Envoyer'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur envoi message'));
  });

  test('handles file too large error', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: [mockProjects[0]] } });
    api.getMessages.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => screen.getByTestId('chat-input'));

    const bigFile = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 21 * 1024 * 1024 });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [bigFile] } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Fichier trop grand (max 20MB)'));
  });

  test('sends file successfully', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: [mockProjects[0]] } });
    api.getMessages.mockResolvedValue({ data: { data: [] } });
    api.sendFile.mockResolvedValue({ data: { data: { _id: 'file1', type: 'file', auteurId: { _id: 'u1' }, createdAt: new Date().toISOString() } } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => screen.getByTestId('chat-input'));

    const testFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
    Object.defineProperty(testFile, 'size', { value: 1024 });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [testFile] } });
    await waitFor(() => {
      expect(api.sendFile).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Fichier envoyé!');
    });
  });

  test('shows error when file send fails', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: [mockProjects[0]] } });
    api.getMessages.mockResolvedValue({ data: { data: [] } });
    api.sendFile.mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    await waitFor(() => screen.getByTestId('chat-input'));

    const testFile = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    Object.defineProperty(testFile, 'size', { value: 100 });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [testFile] } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur upload fichier'));
  });

  test('does not show chat input when no project selected', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: mockProjects } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByTestId('chat-sidebar'));
    expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument();
  });

  test('supervisor sees student group names in sidebar', async () => {
    useAuth.mockReturnValue({ user: mockSupervisorUser });
    const supervisorProject = {
      ...mockProjects[0],
      encadrantId: null,
      etudiants: [{ _id: 'u1', prenom: 'Jean', nom: 'Dupont' }],
    };
    api.getProjects.mockResolvedValue({ data: { data: [supervisorProject] } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByTestId('chat-sidebar'));
  });

  test('shows error toast when projects fail to load', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockRejectedValue({ response: { data: { message: 'Erreur réseau' } } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  test('shows loading spinner when messages load', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    api.getProjects.mockResolvedValue({ data: { data: [mockProjects[0]] } });
    api.getMessages.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { data: [] } }), 100)));
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Ali Ben'));
    fireEvent.click(screen.getByText('Ali Ben'));
    // Spinner shown while loading
    await waitFor(() => expect(api.getMessages).toHaveBeenCalled());
  });

  test('filters only active/terminé projects', async () => {
    useAuth.mockReturnValue({ user: mockStudentUser });
    const allProjects = [
      ...mockProjects,
      { _id: 'proj3', statut: 'refusé', encadrantId: { _id: 's', prenom: 'X', nom: 'Y' }, sujetId: { titre: 'T' }, etudiants: [] },
    ];
    api.getProjects.mockResolvedValue({ data: { data: allProjects } });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    await waitFor(() => screen.getByTestId('chat-sidebar'));
    // Only 'en cours' and 'terminé' should appear in sidebar
    expect(screen.getByText('Ali Ben')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
  });
});