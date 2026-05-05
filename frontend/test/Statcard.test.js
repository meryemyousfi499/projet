import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FiUsers } from 'react-icons/fi';
import StatCard from '../src/components/common/StatCard';

describe('StatCard', () => {
  const defaultProps = {
    icon: FiUsers,
    value: 42,
    label: 'Utilisateurs',
  };

  test('affiche la valeur', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  test('affiche le label', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
  });

  test('affiche l\'icône', () => {
    const { container } = render(<StatCard {...defaultProps} />);
    expect(container.querySelector('.stat-icon')).toBeInTheDocument();
  });

  test('applique iconBg au conteneur d\'icône', () => {
    const { container } = render(<StatCard {...defaultProps} iconBg="#d1fae5" />);
    const iconDiv = container.querySelector('.stat-icon');
    expect(container.innerHTML).toContain('rgb(209, 250, 229)');
  });

  test('applique iconColor à l\'icône', () => {
    const { container } = render(<StatCard {...defaultProps} iconColor="#10b981" />);
    const svg = container.querySelector('svg');
    expect(container.innerHTML).toContain('rgb(16, 185, 129)');
  });

  test('affiche "-" comme valeur par défaut', () => {
    render(<StatCard icon={FiUsers} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  test('accepte une valeur string', () => {
    render(<StatCard {...defaultProps} value="15/20" />);
    expect(screen.getByText('15/20')).toBeInTheDocument();
  });

  test('utilise les valeurs par défaut de fond/couleur si non fournies', () => {
    const { container } = render(<StatCard {...defaultProps} />);
    const iconDiv = container.querySelector('.stat-icon');
    expect(iconDiv).toBeTruthy();
  });
});




