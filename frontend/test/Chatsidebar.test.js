import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatSidebar from '../src/components/chat/ChatSidebar';

jest.mock('../src/components/common/Avatar', () => ({ user }) => (
  <div data-testid="avatar">{user?.prenom || '?'}</div>
));

describe('ChatSidebar', () => {
  const mockProjects = [
    {
      _id: 'proj1',
      encadrantId: { prenom: 'Marie', nom: 'Martin' },
      sujetId: { titre: 'Projet IA' },
      etudiants: [],
    },
    {
      _id: 'proj2',
      encadrantId: { prenom: 'Paul', nom: 'Durand' },
      sujetId: { titre: 'Projet Web' },
      etudiants: [],
    },
  ];

  const onSelect = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('affiche un spinner pendant le chargement', () => {
    const { container } = render(
      <ChatSidebar projects={[]} selectedId={null} onSelect={onSelect} loading={true} />
    );
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  test('affiche le message "Aucun projet actif" quand la liste est vide', () => {
    render(<ChatSidebar projects={[]} selectedId={null} onSelect={onSelect} />);
    expect(screen.getByText('Aucun projet actif')).toBeInTheDocument();
  });

  test('affiche la liste des projets', () => {
    render(<ChatSidebar projects={mockProjects} selectedId={null} onSelect={onSelect} />);
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Paul Durand')).toBeInTheDocument();
  });

  test('affiche les titres des sujets', () => {
    render(<ChatSidebar projects={mockProjects} selectedId={null} onSelect={onSelect} />);
    expect(screen.getByText('Projet IA')).toBeInTheDocument();
    expect(screen.getByText('Projet Web')).toBeInTheDocument();
  });

  test('applique la classe "active" au projet sélectionné', () => {
    const { container } = render(
      <ChatSidebar projects={mockProjects} selectedId="proj1" onSelect={onSelect} />
    );
    const buttons = container.querySelectorAll('.chat-sidebar-item');
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[1].classList.contains('active')).toBe(false);
  });

  test('appelle onSelect avec le projet lors du clic', () => {
    render(<ChatSidebar projects={mockProjects} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Marie Martin'));
    expect(onSelect).toHaveBeenCalledWith(mockProjects[0]);
  });

  test('affiche le nom des étudiants quand pas d\'encadrant', () => {
    const projectWithStudents = [{
      _id: 'proj3',
      encadrantId: null,
      sujetId: { titre: 'Projet Étudiant' },
      etudiants: [{ prenom: 'Alice', nom: 'Leblanc' }, { prenom: 'Bob', nom: 'Leroy' }],
    }];
    render(<ChatSidebar projects={projectWithStudents} selectedId={null} onSelect={onSelect} />);
    expect(screen.getByText('Alice Leblanc, Bob Leroy')).toBeInTheDocument();
  });

  test('affiche les avatars pour chaque projet', () => {
    render(<ChatSidebar projects={mockProjects} selectedId={null} onSelect={onSelect} />);
    expect(screen.getAllByTestId('avatar')).toHaveLength(2);
  });
});
