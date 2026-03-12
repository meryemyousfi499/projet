import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable page header component with title + optional subtitle/actions.
 * Keeps the markup consistent across all pages and handles responsive wrapping.
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node,
};

PageHeader.defaultProps = {
  subtitle: null,
  children: null,
};
