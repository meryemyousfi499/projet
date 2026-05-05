import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FiFolder } from 'react-icons/fi';
import EmptyState from '../src/components/common/EmptyState';

describe('EmptyState', () => {
  test('affiche le titre', () => {
    render(<EmptyState title="Aucun élément" />);
    expect(screen.getByText('Aucun élément')).toBeInTheDocument();
  });

  test('affiche le texte descriptif', () => {
    render(<EmptyState text="Commencez par créer un élément." />);
    expect(screen.getByText('Commencez par créer un élément.')).toBeInTheDocument();
  });

  test('affiche l\'icône quand elle est fournie', () => {
    const { container } = render(<EmptyState icon={FiFolder} />);
    expect(container.querySelector('.empty-state-icon')).toBeInTheDocument();
  });

  test('n\'affiche pas l\'icône quand elle est absente', () => {
    const { container } = render(<EmptyState title="Titre" />);
    expect(container.querySelector('.empty-state-icon')).toBeNull();
  });

  test('affiche le slot action', () => {
    render(<EmptyState action={<button>Créer</button>} />);
    expect(screen.getByText('Créer')).toBeInTheDocument();
  });

  test('n\'affiche pas l\'action quand elle est absente', () => {
    const { container } = render(<EmptyState title="Titre" />);
    expect(container.querySelector('.empty-state-action')).toBeNull();
  });

  test('rend correctement avec toutes les props', () => {
    render(
      <EmptyState
        icon={FiFolder}
        title="Aucun projet"
        text="Aucun projet trouvé."
        action={<button>Nouveau projet</button>}
      />
    );
    expect(screen.getByText('Aucun projet')).toBeInTheDocument();
    expect(screen.getByText('Aucun projet trouvé.')).toBeInTheDocument();
    expect(screen.getByText('Nouveau projet')).toBeInTheDocument();
  });

  test('rend sans aucune prop sans erreur', () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector('.empty-state')).toBeInTheDocument();
  });
});
