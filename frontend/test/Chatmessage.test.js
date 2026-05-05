import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ChatMessage from '../src/components/chat/ChatMessage';
import { FiFile } from 'react-icons/fi';

// Mock Avatar pour isoler le test
jest.mock('../src/components/common/Avatar', () => ({ user, size }) => (
  <div data-testid="avatar" data-size={size}>{user?.prenom}</div>
));

describe('ChatMessage', () => {
  const currentUser = { _id: 'user1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' };

  const myMessage = {
    _id: 'msg1',
    auteurId: { _id: 'user1', prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' },
    content: 'Bonjour!',
    type: 'text',
    createdAt: '2024-01-15T10:30:00Z',
  };

  const otherMessage = {
    _id: 'msg2',
    auteurId: { _id: 'user2', prenom: 'Marie', nom: 'Martin', role: 'ROLE_SUPERVISOR' },
    content: 'Bonjour à vous!',
    type: 'text',
    createdAt: '2024-01-15T10:31:00Z',
  };

  test('affiche le contenu du message', () => {
    render(<ChatMessage message={myMessage} currentUser={currentUser} />);
    expect(screen.getByText('Bonjour!')).toBeInTheDocument();
  });

  test('applique la classe "mine" pour le message de l\'utilisateur courant', () => {
    const { container } = render(<ChatMessage message={myMessage} currentUser={currentUser} />);
    expect(container.querySelector('.chat-message.mine')).toBeInTheDocument();
  });

  test('applique la classe "other" pour un message d\'un autre utilisateur', () => {
    const { container } = render(<ChatMessage message={otherMessage} currentUser={currentUser} />);
    expect(container.querySelector('.chat-message.other')).toBeInTheDocument();
  });

  test('affiche l\'avatar pour les messages des autres', () => {
    render(<ChatMessage message={otherMessage} currentUser={currentUser} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  test('affiche l\'heure du message', () => {
    render(<ChatMessage message={myMessage} currentUser={currentUser} />);
    const timeEl = document.querySelector('.chat-time');
    expect(timeEl).toBeInTheDocument();
    expect(timeEl.textContent).toMatch(/\d{2}:\d{2}/);
  });

  test('affiche un lien de téléchargement pour les messages de type fichier', () => {
    const fileMessage = {
      ...myMessage,
      type: 'file',
      fichier: { url: 'https://example.com/file.pdf', nom: 'rapport.pdf', taille: 2048000 },
    };
    render(<ChatMessage message={fileMessage} currentUser={currentUser} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/file.pdf');
    expect(link).toHaveAttribute('download');
  });

  test('affiche le nom du fichier dans le lien', () => {
    const fileMessage = {
      ...myMessage,
      type: 'file',
      fichier: { url: 'https://example.com/file.pdf', nom: 'rapport.pdf', taille: 1024 },
    };
    render(<ChatMessage message={fileMessage} currentUser={currentUser} />);
    expect(screen.getByText(/rapport\.pdf/)).toBeInTheDocument();
  });

  test('formate la taille en KB', () => {
    const fileMessage = {
      ...myMessage,
      type: 'file',
      fichier: { url: '#', nom: 'doc.pdf', taille: 2048 },
    };
    render(<ChatMessage message={fileMessage} currentUser={currentUser} />);
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });

  test('formate la taille en MB', () => {
    const fileMessage = {
      ...myMessage,
      type: 'file',
      fichier: { url: '#', nom: 'video.mp4', taille: 5 * 1024 * 1024 },
    };
    render(<ChatMessage message={fileMessage} currentUser={currentUser} />);
    expect(screen.getByText(/5\.0 MB/)).toBeInTheDocument();
  });
});



