import React from 'react';
import PropTypes from 'prop-types';
import { FiMessageSquare } from 'react-icons/fi';
import Avatar from '../common/Avatar';

/**
 * Sidebar showing list of active projects/conversations.
 * Expects an array of project objects and selected id.
 * onSelect(project) fired when user clicks an item.
 */
export default function ChatSidebar({ projects, selectedId, onSelect, loading }) {
  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
        <FiMessageSquare size={32} className="empty-state-icon" />
        <div className="empty-state-title">Aucun projet actif</div>
        <div className="empty-state-text" style={{ fontSize: 12, color: '#b0b4c0' }}>
          La messagerie est disponible uniquement quand votre groupe a un projet en cours.<br />
          Postulez à un sujet et attendez la validation de l'encadrant.
        </div>
      </div>
    );
  }

  return (
    <nav className="chat-sidebar">
      {projects.map(project => {
        const isActive = selectedId === project._id;
        return (
          <button
            key={project._id}
            className={`chat-sidebar-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(project)}
            title={getProjectLabel(project)}
          >
            <div className="chat-sidebar-avatar">
              <Avatar user={getOtherParty(project)} size={42} />
            </div>
            <div className="chat-sidebar-details">
              <div className="chat-sidebar-name">{getProjectLabel(project)}</div>
              <div className="chat-sidebar-subtitle">{project.sujetId?.titre}</div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

// helpers
function getOtherParty(project) {
  // replicated from previous file, could be lifted outside
  return project?.encadrantId || null;
}
function getProjectLabel(project) {
  if (!project) return '';
  if (project.encadrantId) {
    return `${project.encadrantId.prenom || ''} ${project.encadrantId.nom || ''}`.trim() || 'Encadrant';
  }
  return project.etudiants?.map(e => `${e.prenom} ${e.nom}`).join(', ') || 'Groupe';
}

ChatSidebar.propTypes = {
  projects: PropTypes.array.isRequired,
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

ChatSidebar.defaultProps = {
  selectedId: null,
  loading: false,
};
