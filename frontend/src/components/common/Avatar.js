import React from 'react';
import PropTypes from 'prop-types';

/**
 * Generic avatar with gradient background based on role.
 * Accepts a user object containing prenom, nom, and role.
 * Optional size prop (number).
 */
export default function Avatar({ user, size = 36 }) {
  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || '?';
  const colors = { ROLE_STUDENT: '#10b981', ROLE_SUPERVISOR: '#5b5fcf', ROLE_ADMIN: '#f59e0b' };
  const bg = colors[user?.role] || '#5b5fcf';
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${bg}, ${bg}99)`,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}

Avatar.propTypes = {
  user: PropTypes.object.isRequired,
  size: PropTypes.number,
};

Avatar.defaultProps = {
  size: 36,
};
