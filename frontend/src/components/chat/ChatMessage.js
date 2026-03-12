import React from 'react';
import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';

/**
 * Single message bubble. Determines alignment depending on author === currentUser.
 * Supports text or file attachments.
 */
export default function ChatMessage({ message, currentUser }) {
  const isMine = message.auteurId?._id === currentUser?._id;
  const dateStr = new Date(message.createdAt).toLocaleString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className={`chat-message ${isMine ? 'mine' : 'other'}`}>
      {!isMine && <Avatar user={message.auteurId} size={32} />}
      <div className="chat-bubble">
        {message.type === 'file' && message.fichier ? (
          <a href={message.fichier.url} className="chat-file-link" download>
            <FiFile /> {message.fichier.nom} ({formatSize(message.fichier.taille)})
          </a>
        ) : (
          <span>{message.content}</span>
        )}
        <div className="chat-time">{dateStr}</div>
      </div>
      {isMine && <Avatar user={message.auteurId} size={32} />}
    </div>
  );
}

// reuse size formatter from original file (could extract later)
function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

ChatMessage.propTypes = {
  message: PropTypes.object.isRequired,
  currentUser: PropTypes.object.isRequired,
};
