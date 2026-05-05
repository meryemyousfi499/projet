import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../src/components/chat/ChatInput';

describe('ChatInput', () => {
  const defaultProps = {
    text: '',
    onChange: jest.fn(),
    onSend: jest.fn(),
    onFileSelect: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  test('affiche le placeholder', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Écrire un message...')).toBeInTheDocument();
  });

  test('affiche la valeur du texte', () => {
    render(<ChatInput {...defaultProps} text="Bonjour" />);
    expect(screen.getByDisplayValue('Bonjour')).toBeInTheDocument();
  });

  test('appelle onChange lors de la saisie', () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Écrire un message...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith('Hello');
  });

  test('appelle onSend au clic sur le bouton Envoyer', () => {
    render(<ChatInput {...defaultProps} text="un message" />);
    const btn = screen.getByTitle('Envoyer');
    fireEvent.click(btn);
    expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
  });

  test('appelle onSend en appuyant sur Enter (sans Shift)', () => {
    render(<ChatInput {...defaultProps} text="message" />);
    const textarea = screen.getByPlaceholderText('Écrire un message...');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
  });

  test('n\'appelle pas onSend avec Shift+Enter', () => {
    render(<ChatInput {...defaultProps} text="message" />);
    const textarea = screen.getByPlaceholderText('Écrire un message...');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  test('désactive le bouton Envoyer quand le texte est vide', () => {
    render(<ChatInput {...defaultProps} text="" />);
    expect(screen.getByTitle('Envoyer')).toBeDisabled();
  });

  test('désactive le bouton Envoyer quand sending=true', () => {
    render(<ChatInput {...defaultProps} text="message" sending={true} />);
    expect(screen.getByTitle('Envoyer')).toBeDisabled();
  });

  test('désactive le bouton Envoyer quand uploading=true', () => {
    render(<ChatInput {...defaultProps} text="message" uploading={true} />);
    expect(screen.getByTitle('Envoyer')).toBeDisabled();
  });

  test('désactive le textarea quand sending=true', () => {
    render(<ChatInput {...defaultProps} sending={true} />);
    expect(screen.getByPlaceholderText('Écrire un message...')).toBeDisabled();
  });

  test('affiche le bouton de pièce jointe', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByTitle('Joindre un fichier')).toBeInTheDocument();
  });

  test('le bouton Envoyer est actif quand le texte n\'est pas vide', () => {
    render(<ChatInput {...defaultProps} text="message valide" />);
    expect(screen.getByTitle('Envoyer')).not.toBeDisabled();
  });
});
