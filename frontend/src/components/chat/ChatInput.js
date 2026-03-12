import React from 'react';
import PropTypes from 'prop-types';
import { FiSend, FiPaperclip } from 'react-icons/fi';

export default function ChatInput({ text, onChange, onSend, onFileSelect, sending, uploading }) {
  return (
    <div className="chat-input-bar">
      <textarea
        className="chat-input"
        rows={1}
        value={text}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder="Écrire un message..."
        disabled={sending}
      />
      <input
        type="file"
        style={{ display: 'none' }}
        onChange={onFileSelect}
        id="chat-file-input"
      />
      <label htmlFor="chat-file-input" className="btn btn-outline btn-sm" title="Joindre un fichier">
        <FiPaperclip />
      </label>
      <button
        className="btn btn-primary btn-sm chat-send-btn"
        onClick={onSend}
        disabled={sending || uploading || !text.trim()}
        title="Envoyer"
      >
        <FiSend />
      </button>
    </div>
  );
}

ChatInput.propTypes = {
  text: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  onFileSelect: PropTypes.func.isRequired,
  sending: PropTypes.bool,
  uploading: PropTypes.bool,
};

ChatInput.defaultProps = {
  sending: false,
  uploading: false,
};
