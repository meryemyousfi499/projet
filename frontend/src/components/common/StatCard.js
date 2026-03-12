import React from 'react';
import PropTypes from 'prop-types';

/**
 * Simple card showing a statistic value and label with an icon.
 * Extracted from several dashboards to avoid inline styling and keep
 * consistent spacing/typography.
 */
export default function StatCard({ icon: Icon, iconBg, iconColor, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon size={22} style={{ color: iconColor }} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  iconBg: PropTypes.string,
  iconColor: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
};

StatCard.defaultProps = {
  iconBg: 'var(--light-gray)',
  iconColor: 'var(--dark)',
  value: '-',
  label: '',
};
