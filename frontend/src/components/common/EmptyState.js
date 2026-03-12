import React from 'react';
import PropTypes from 'prop-types';

/**
 * Very simple empty state block with icon, title, text and optional action.
 * Helps reduce repeated markup in pages where there is "no data yet".
 */
export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon"><Icon /></div>}
      {title && <div className="empty-state-title">{title}</div>}
      {text && <div className="empty-state-text">{text}</div>}
      {action && <div className="empty-state-action" style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.node,
  text: PropTypes.node,
  action: PropTypes.node,
};

EmptyState.defaultProps = {
  icon: null,
  title: null,
  text: null,
  action: null,
};
