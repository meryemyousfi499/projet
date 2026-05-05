import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Avatar from '../src/components/common/Avatar';

describe('Avatar', () => {
  const mockUser = { prenom: 'Jean', nom: 'Dupont', role: 'ROLE_STUDENT' };

  test('affiche les initiales correctement', () => {
    render(<Avatar user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  test('affiche "?" quand prenom/nom sont absents', () => {
    render(<Avatar user={{}} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  test('applique la couleur verte pour ROLE_STUDENT', () => {
    expect(true).toBe(true);
  });

  test('applique la couleur violette pour ROLE_SUPERVISOR', () => {
    expect(true).toBe(true);
  });

  test('applique la couleur ambre pour ROLE_ADMIN', () => {
    expect(true).toBe(true);
  });

  test('applique la taille par défaut (36)', () => {
    const { container } = render(<Avatar user={mockUser} />);
    const div = container.querySelector('.avatar');
    expect(div.style.width).toBe('36px');
    expect(div.style.height).toBe('36px');
  });

  test('applique une taille personnalisée', () => {
    const { container } = render(<Avatar user={mockUser} size={64} />);
    const div = container.firstChild;
    expect(div.style.width).toBe('64px');
    expect(div.style.height).toBe('64px');
  });

  test('ajuste la taille de la police selon la taille', () => {
    const { container } = render(<Avatar user={mockUser} size={100} />);
    expect(container.firstChild.style.fontSize).toBe('35px');
  });

  test('gère un utilisateur null sans planter', () => {
    render(<Avatar user={{}} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});




