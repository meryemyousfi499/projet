import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PageHeader from '../src/components/common/PageHeader';

describe('PageHeader', () => {
  test('affiche le titre', () => {
    render(<PageHeader title="Mon Titre" />);
    expect(screen.getByText('Mon Titre')).toBeInTheDocument();
  });

  test('affiche le sous-titre quand fourni', () => {
    render(<PageHeader title="Titre" subtitle="Un sous-titre" />);
    expect(screen.getByText('Un sous-titre')).toBeInTheDocument();
  });

  test('n\'affiche pas le sous-titre quand absent', () => {
    const { container } = render(<PageHeader title="Titre" />);
    expect(container.querySelector('.page-subtitle')).toBeNull();
  });

  test('affiche les enfants (actions) quand fournis', () => {
    render(
      <PageHeader title="Titre">
        <button>Ajouter</button>
      </PageHeader>
    );
    expect(screen.getByText('Ajouter')).toBeInTheDocument();
  });

  test('n\'affiche pas le conteneur d\'actions quand pas d\'enfants', () => {
    const { container } = render(<PageHeader title="Titre" />);
    expect(container.querySelector('.page-header-actions')).toBeNull();
  });

  test('le titre est un h1', () => {
    render(<PageHeader title="Titre" />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  test('accepte un titre sous forme de nœud React', () => {
    render(<PageHeader title={<span data-testid="custom-title">Titre Personnalisé</span>} />);
    expect(screen.getByTestId('custom-title')).toBeInTheDocument();
  });
});
