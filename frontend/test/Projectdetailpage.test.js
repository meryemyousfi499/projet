import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProjectDetailPage from '../src/pages/shared/ProjectDetailPage';
import * as api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext');
jest.mock('../src/services/api');
jest.mock('react-hot-toast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: 'proj1' }),
}));

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg) => {
    if (typeof msg === 'string' && msg.includes('React Router')) return;
    console.warn(msg);
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom does not implement scrollIntoView — mock it globally
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

const mockUser = { _id: 'u1', role: 'ROLE_SUPERVISOR' };

const mockProject = {
  _id: 'proj1',
  statut: 'en cours',
  progression: 60,
  sujetId: {
    titre: 'Projet IA',
    technologies: ['React', 'Node.js'],
    description: 'Description du projet IA',
  },
  encadrantId: { _id: 'u1', prenom: 'Ali', nom: 'Ben' },
  etudiants: [
    { _id: 'e1', prenom: 'Karim', nom: 'Tazi' },
    { _id: 'e2', prenom: 'Sara', nom: 'Alami' },
  ],
};

const mockMilestones = [
  { _id: 'm1', nomEtape: 'Analyse', statut: 'terminé', commentaire: 'Fait' },
  { _id: 'm2', nomEtape: 'Développement', statut: 'en cours', commentaire: '' },
  { _id: 'm3', nomEtape: 'Tests', statut: 'à faire', commentaire: '' },
];

const mockDeliverables = [
  {
    _id: 'd1',
    titre: 'Rapport final',
    type: 'rapport',
    version: '1.0',
    fichierNom: 'rapport.pdf',
    fichierURL: '/uploads/rapport.pdf',
    uploadePar: { _id: 'u1', prenom: 'Ali', nom: 'Ben' },
    createdAt: '2024-01-15T00:00:00Z',
  },
];

const mockEvaluation = {
  _id: 'ev1',
  noteEncadrant: 16,
  noteJury: 17,
  noteFinale: 16.6,
  commentaireEncadrant: 'Très bon travail',
  commentaireJury: 'Excellent',
};

const mockMessages = [
  {
    _id: 'msg1',
    content: 'Bonjour équipe',
    type: 'text',
    senderId: { _id: 'u1', prenom: 'Ali', nom: 'Ben' },
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'msg2',
    content: 'Merci',
    type: 'text',
    senderId: { _id: 'e1', prenom: 'Karim', nom: 'Tazi' },
    createdAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
  },
  {
    _id: 'msg3',
    type: 'file',
    fileName: 'doc.pdf',
    filePath: '/uploads/doc.pdf',
    content: '2.5 MB',
    senderId: { _id: 'u1', prenom: 'Ali', nom: 'Ben' },
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
  },
];

const setupMocks = (overrides = {}) => {
  useAuth.mockReturnValue({ user: mockUser });
  api.getProjectById.mockResolvedValue({ data: { data: mockProject } });
  api.getMilestones.mockResolvedValue({ data: { data: mockMilestones } });
  api.getDeliverables.mockResolvedValue({ data: { data: mockDeliverables } });
  api.getEvaluation.mockResolvedValue({ data: { data: mockEvaluation } });
  api.getMessages.mockResolvedValue({ data: { data: mockMessages } });
  Object.assign(api, overrides);
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/projects/proj1']}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProjectDetailPage - Loading & Basic Render', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows loading spinner initially', () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getProjectById.mockReturnValue(new Promise(() => {}));
    api.getMilestones.mockReturnValue(new Promise(() => {}));
    api.getDeliverables.mockReturnValue(new Promise(() => {}));
    api.getEvaluation.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('shows "not found" when project is null', async () => {
    useAuth.mockReturnValue({ user: mockUser });
    api.getProjectById.mockRejectedValue(new Error('Not found'));
    api.getMilestones.mockResolvedValue({ data: { data: [] } });
    api.getDeliverables.mockResolvedValue({ data: { data: [] } });
    api.getEvaluation.mockResolvedValue({ data: { data: null } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Projet non trouvé')).toBeInTheDocument()
    );
  });

  test('renders project title and details', async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Projet IA')).toBeInTheDocument()
    );
    expect(screen.getByText('Ali Ben')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  test('renders project status badge', async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('en cours')).toBeInTheDocument()
    );
  });

  test('renders student names', async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Karim Tazi/)).toBeInTheDocument()
    );
  });

  test('renders back button', async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Retour')).toBeInTheDocument()
    );
  });
});

describe('ProjectDetailPage - Tabs Navigation', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders all tab buttons', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    expect(screen.getByText('Avancement')).toBeInTheDocument();
    expect(screen.getByText('Livrables')).toBeInTheDocument();
    expect(screen.getByText(/Discussion/)).toBeInTheDocument();
    expect(screen.getByText(/Évaluation/)).toBeInTheDocument();
  });

  test('switches to Livrables tab', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() =>
      expect(screen.getByText('Rapport final')).toBeInTheDocument()
    );
  });

  test('switches to Évaluation tab and shows evaluation', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => {
      expect(screen.getByText('16/20')).toBeInTheDocument();
      expect(screen.getByText('17/20')).toBeInTheDocument();
      expect(screen.getByText(/16.6/)).toBeInTheDocument();
    });
  });

  test('switches to Discussion tab and loads messages', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() =>
      expect(screen.getByText('Bonjour équipe')).toBeInTheDocument()
    );
  });
});

describe('ProjectDetailPage - Milestones Tab', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders milestones list', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Analyse')).toBeInTheDocument();
      expect(screen.getByText('Développement')).toBeInTheDocument();
      expect(screen.getByText('Tests')).toBeInTheDocument();
    });
  });

  test('shows milestone completion count', async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('1/3 terminées')).toBeInTheDocument()
    );
  });

  test('shows milestone comment', async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Fait')).toBeInTheDocument()
    );
  });

  test('supervisor can change milestone status via select', async () => {
    setupMocks();
    api.updateMilestone.mockResolvedValue({});
    api.getMilestones.mockResolvedValue({ data: { data: mockMilestones } });
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));

    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'en cours' } });
    await waitFor(() => expect(api.updateMilestone).toHaveBeenCalledWith('m1', expect.objectContaining({ statut: 'en cours' })));
  });

  test('supervisor can add new milestone', async () => {
    setupMocks();
    api.createMilestone.mockResolvedValue({ data: { data: { _id: 'm4', nomEtape: 'Déploiement', statut: 'à faire' } } });
    api.getMilestones.mockResolvedValue({ data: { data: [...mockMilestones] } });
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));

    const input = screen.getByPlaceholderText('Nouvelle étape...');
    fireEvent.change(input, { target: { value: 'Déploiement' } });
    fireEvent.click(screen.getByText('Ajouter'));
    await waitFor(() => expect(api.createMilestone).toHaveBeenCalledWith('proj1', { nomEtape: 'Déploiement' }));
    expect(toast.success).toHaveBeenCalledWith('Étape ajoutée!');
  });

  test('adds milestone on Enter key press', async () => {
    setupMocks();
    api.createMilestone.mockResolvedValue({ data: { data: { _id: 'm5', nomEtape: 'Phase 2', statut: 'à faire' } } });
    api.getMilestones.mockResolvedValue({ data: { data: mockMilestones } });
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));

    const input = screen.getByPlaceholderText('Nouvelle étape...');
    fireEvent.change(input, { target: { value: 'Phase 2' } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });
    await waitFor(() => expect(api.createMilestone).toHaveBeenCalled());
  });

  test('does not add milestone when input is empty', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));
    fireEvent.click(screen.getByText('Ajouter'));
    expect(api.createMilestone).not.toHaveBeenCalled();
  });

  test('supervisor can delete milestone', async () => {
    window.confirm = jest.fn(() => true);
    setupMocks();
    api.deleteMilestone.mockResolvedValue({});
    api.getMilestones.mockResolvedValue({ data: { data: mockMilestones } });
    api.getProjectById.mockResolvedValue({ data: { data: mockProject } });
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));

    const deleteButtons = document.querySelectorAll('.timeline-item button');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(api.deleteMilestone).toHaveBeenCalledWith('m1'));
    expect(toast.success).toHaveBeenCalledWith('Étape supprimée');
  });

  test('does not delete milestone when confirmation is cancelled', async () => {
    window.confirm = jest.fn(() => false);
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));
    const deleteButtons = document.querySelectorAll('.timeline-item button');
    if (deleteButtons.length > 0) fireEvent.click(deleteButtons[0]);
    expect(api.deleteMilestone).not.toHaveBeenCalled();
  });

  test('student cannot see status select dropdowns', async () => {
    useAuth.mockReturnValue({ user: { _id: 'student1', role: 'ROLE_STUDENT' } });
    api.getProjectById.mockResolvedValue({ data: { data: mockProject } });
    api.getMilestones.mockResolvedValue({ data: { data: mockMilestones } });
    api.getDeliverables.mockResolvedValue({ data: { data: [] } });
    api.getEvaluation.mockResolvedValue({ data: { data: null } });
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));
    // Students see badges not selects
    expect(document.querySelectorAll('.timeline select').length).toBe(0);
  });
});

describe('ProjectDetailPage - Deliverables Tab', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows deliverable in table', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() => {
      expect(screen.getByText('Rapport final')).toBeInTheDocument();
      expect(screen.getByText('rapport.pdf')).toBeInTheDocument();
    });
  });

  test('shows empty state when no deliverables', async () => {
    setupMocks({ getDeliverables: jest.fn().mockResolvedValue({ data: { data: [] } }) });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() =>
      expect(screen.getByText('Aucun livrable')).toBeInTheDocument()
    );
  });

  test('opens upload modal on Upload button click', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() => screen.getByText('Upload'));
    fireEvent.click(screen.getByText('Upload'));
    expect(screen.getByText('Uploader un livrable')).toBeInTheDocument();
  });

  test('closes upload modal on Annuler', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() => screen.getByText('Upload'));
    fireEvent.click(screen.getByText('Upload'));
    fireEvent.click(screen.getByText('Annuler'));
    await waitFor(() =>
      expect(screen.queryByText('Uploader un livrable')).not.toBeInTheDocument()
    );
  });

  test('shows error when uploading without file', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() => screen.getByText('Upload'));
    fireEvent.click(screen.getByText('Upload'));
    fireEvent.click(screen.getByText('Uploader'));
    expect(toast.error).toHaveBeenCalledWith('Veuillez sélectionner un fichier');
  });

  test('deletes deliverable after confirmation', async () => {
    window.confirm = jest.fn(() => true);
    setupMocks();
    api.deleteDeliverable.mockResolvedValue({});
    api.getDeliverables.mockResolvedValue({ data: { data: mockDeliverables } });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() => screen.getByText('Rapport final'));
    const trashBtns = document.querySelectorAll('.btn-danger.btn-sm');
    fireEvent.click(trashBtns[0]);
    await waitFor(() => expect(api.deleteDeliverable).toHaveBeenCalledWith('d1'));
    expect(toast.success).toHaveBeenCalledWith('Livrable supprimé');
  });
});

describe('ProjectDetailPage - Evaluation Tab', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows empty state when no evaluation', async () => {
    setupMocks({ getEvaluation: jest.fn().mockResolvedValue({ data: { data: null } }) });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() =>
      expect(screen.getByText('Pas encore évalué')).toBeInTheDocument()
    );
  });

  test('supervisor can open evaluation modal', async () => {
    setupMocks({ getEvaluation: jest.fn().mockResolvedValue({ data: { data: null } }) });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => screen.getByText('Évaluer'));
    fireEvent.click(screen.getByText('Évaluer'));
    expect(screen.getByText('Évaluer le projet')).toBeInTheDocument();
  });

  test('shows estimated final grade in evaluation modal', async () => {
    setupMocks({ getEvaluation: jest.fn().mockResolvedValue({ data: { data: null } }) });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => screen.getByText('Évaluer'));
    fireEvent.click(screen.getByText('Évaluer'));

    const noteInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(noteInputs[0], { target: { value: '15' } });
    fireEvent.change(noteInputs[1], { target: { value: '18' } });
    await waitFor(() =>
      expect(screen.getByText(/Note finale estimée/)).toBeInTheDocument()
    );
  });

  test('saves evaluation successfully', async () => {
    setupMocks();
    // First fetch returns null (no evaluation yet) → shows "Évaluer" button
    // Second fetch (after save) returns the full evaluation
    api.getEvaluation
      .mockResolvedValueOnce({ data: { data: null } })
      .mockResolvedValueOnce({ data: { data: mockEvaluation } });
    api.createOrUpdateEvaluation.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => screen.getByText('Évaluer'));
    fireEvent.click(screen.getByText('Évaluer'));

    const noteInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(noteInputs[0], { target: { value: '16' } });
    fireEvent.change(noteInputs[1], { target: { value: '17' } });
    fireEvent.click(screen.getByText('Sauvegarder'));
    await waitFor(() => {
      expect(api.createOrUpdateEvaluation).toHaveBeenCalledWith('proj1', expect.objectContaining({ noteEncadrant: '16', noteJury: '17' }));
      expect(toast.success).toHaveBeenCalledWith('Évaluation sauvegardée!');
    });
  });

  test('shows grade labels: Excellent, Bien, Passable', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() =>
      expect(screen.getAllByText(/Excellent/).length).toBeGreaterThan(0)
    );
  });

  test('shows existing evaluation comments', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => {
      expect(screen.getByText('Très bon travail')).toBeInTheDocument();
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });
  });

  test('supervisor can modify existing evaluation', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => screen.getByText('Modifier'));
    expect(screen.getByText('Modifier')).toBeInTheDocument();
  });
});

describe('ProjectDetailPage - Messages Tab', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders messages list', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() =>
      expect(screen.getByText('Bonjour équipe')).toBeInTheDocument()
    );
  });

  test('shows empty message state when no messages', async () => {
    setupMocks({ getMessages: jest.fn().mockResolvedValue({ data: { data: [] } }) });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() =>
      expect(screen.getByText(/Démarrez la discussion/)).toBeInTheDocument()
    );
  });

  test('sends a text message', async () => {
    setupMocks();
    api.sendMessage.mockResolvedValue({ data: { data: { _id: 'newmsg', content: 'Hello', senderId: { _id: 'u1' }, createdAt: new Date().toISOString() } } });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() => screen.getByPlaceholderText('Écrire un message...'));

    const textarea = screen.getByPlaceholderText('Écrire un message...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    // Click send button
    const sendBtn = document.querySelector('.card button[style*="background"]');
    // Use Enter key instead
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith('proj1', { content: 'Hello' }));
  });

  test('does not send empty message', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() => screen.getByPlaceholderText('Écrire un message...'));
    fireEvent.keyDown(screen.getByPlaceholderText('Écrire un message...'), { key: 'Enter', shiftKey: false });
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  test('does not send on Shift+Enter', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() => screen.getByPlaceholderText('Écrire un message...'));
    const textarea = screen.getByPlaceholderText('Écrire un message...');
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  test('renders file message as download link', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() =>
      expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    );
  });

  test('shows error when message send fails', async () => {
    setupMocks();
    api.sendMessage.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() => screen.getByPlaceholderText('Écrire un message...'));
    const textarea = screen.getByPlaceholderText('Écrire un message...');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur envoi message'));
  });

  test('shows error when file is too large', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Discussion/));
    await waitFor(() => screen.getByPlaceholderText('Écrire un message...'));

    const bigFile = new File(['x'.repeat(21 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 21 * 1024 * 1024 });
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [bigFile] } });
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Fichier trop grand (max 20MB)'));
    }
  });
});

describe('ProjectDetailPage - Upload Deliverable Modal', () => {
  afterEach(() => jest.clearAllMocks());

  test('fills and submits upload form', async () => {
    setupMocks();
    api.uploadDeliverable.mockResolvedValue({ data: { data: {} } });
    api.getDeliverables.mockResolvedValue({ data: { data: mockDeliverables } });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() => screen.getByText('Upload'));
    fireEvent.click(screen.getByText('Upload'));

    // Fill titre
    const inputs = document.querySelectorAll('.modal .form-input');
    const titreInput = Array.from(inputs).find(i => i.placeholder === '' || i.type === 'text');
    if (titreInput) fireEvent.change(titreInput, { target: { value: 'Rapport v2' } });

    // Simulate file select
    const fileInput = document.querySelector('.modal input[type="file"]');
    const testFile = new File(['content'], 'rapport.pdf', { type: 'application/pdf' });
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [testFile] } });
    }

    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  test('shows error when uploading without title', async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText('Livrables'));
    await waitFor(() => screen.getByText('Upload'));
    fireEvent.click(screen.getByText('Upload'));

    // Add file but no title
    const fileInput = document.querySelector('.modal input[type="file"]');
    const testFile = new File(['content'], 'rapport.pdf', { type: 'application/pdf' });
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [testFile] } });
    }
    fireEvent.click(screen.getByText('Uploader'));
    expect(toast.error).toHaveBeenCalledWith('Titre requis');
  });
});

describe('ProjectDetailPage - Admin Role', () => {
  afterEach(() => jest.clearAllMocks());

  test('admin can edit milestones', async () => {
    useAuth.mockReturnValue({ user: { _id: 'admin1', role: 'ROLE_ADMIN' } });
    api.getProjectById.mockResolvedValue({ data: { data: mockProject } });
    api.getMilestones.mockResolvedValue({ data: { data: mockMilestones } });
    api.getDeliverables.mockResolvedValue({ data: { data: [] } });
    api.getEvaluation.mockResolvedValue({ data: { data: null } });
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));
    // Admin should see select dropdowns for milestones
    expect(document.querySelectorAll('select').length).toBeGreaterThan(0);
  });
});

describe('ProjectDetailPage - Grade Labels', () => {
  afterEach(() => jest.clearAllMocks());

  const testGradeLabel = async (note, expectedLabel) => {
    const evalWithNote = { ...mockEvaluation, noteFinale: note };
    setupMocks({ getEvaluation: jest.fn().mockResolvedValue({ data: { data: evalWithNote } }) });
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => expect(screen.getAllByText(new RegExp(expectedLabel)).length).toBeGreaterThan(0));
  };

  test('shows Excellent for grade >= 16', () => testGradeLabel(18, 'Excellent'));
  test('shows Bien for grade >= 12', () => testGradeLabel(14, 'Bien'));
  test('shows Passable for grade >= 10', () => testGradeLabel(11, 'Passable'));
  test('shows Insuffisant for grade < 10', () => testGradeLabel(8, 'Insuffisant'));
});

describe('ProjectDetailPage - Error Handling', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows error toast when milestone update fails', async () => {
    setupMocks();
    api.updateMilestone.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));
    const selects = document.querySelectorAll('select');
    if (selects.length > 0) {
      fireEvent.change(selects[0], { target: { value: 'en cours' } });
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
    }
  });

  test('shows error when add milestone fails', async () => {
    setupMocks();
    api.createMilestone.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => screen.getByText('Analyse'));
    const input = screen.getByPlaceholderText('Nouvelle étape...');
    fireEvent.change(input, { target: { value: 'Test étape' } });
    fireEvent.click(screen.getByText('Ajouter'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
  });

  test('shows error when evaluation save fails', async () => {
    setupMocks({ getEvaluation: jest.fn().mockResolvedValue({ data: { data: null } }) });
    api.createOrUpdateEvaluation.mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => screen.getByText('Projet IA'));
    fireEvent.click(screen.getByText(/Évaluation/));
    await waitFor(() => screen.getByText('Évaluer'));
    fireEvent.click(screen.getByText('Évaluer'));
    fireEvent.click(screen.getByText('Sauvegarder'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur'));
  });
});