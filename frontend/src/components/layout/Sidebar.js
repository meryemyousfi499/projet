import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiGrid, FiUsers, FiBookOpen, FiFolder, FiFileText, FiBell,
  FiUser, FiLogOut, FiChevronLeft, FiChevronRight, FiCheck,
  FiUsers as FiGroup, FiBriefcase, FiMessageSquare, FiClipboard
} from 'react-icons/fi';
import { getUnreadCounts } from '../../services/api';
import './Sidebar.css';

const navItems = {
  ROLE_STUDENT: [
    { to: '/dashboard',  icon: FiGrid,          label: 'Dashboard' },
    { to: '/subjects',   icon: FiBookOpen,      label: 'Sujets' },
    { to: '/group',      icon: FiGroup,         label: 'Mon groupe' },
    { to: '/my-project', icon: FiBriefcase,     label: 'Mon projet' },
    { to: '/messages',   icon: FiMessageSquare, label: 'Messages', badge: true },
    { to: '/notifications', icon: FiBell,       label: 'Notifications' },
    { to: '/profile',    icon: FiUser,          label: 'Mon profil' },
  ],
  ROLE_SUPERVISOR: [
    { to: '/dashboard',           icon: FiGrid,          label: 'Dashboard' },
    { to: '/my-subjects',         icon: FiBookOpen,      label: 'Mes sujets' },
    { to: '/supervisor-projects', icon: FiBriefcase,     label: 'Mes projets' },
    { to: '/applications-review', icon: FiCheck,         label: 'Candidatures' },
    { to: '/messages',            icon: FiMessageSquare, label: 'Messages', badge: true },
    { to: '/notifications',       icon: FiBell,          label: 'Notifications' },
    { to: '/profile',             icon: FiUser,          label: 'Mon profil' },
  ],
  ROLE_ADMIN: [
    { to: '/dashboard',     icon: FiGrid,     label: 'Dashboard' },
    { to: '/users',         icon: FiUsers,    label: 'Utilisateurs' },
    { to: '/admin-subjects',icon: FiBookOpen, label: 'Sujets' },
    { to: '/admin-projects',icon: FiBriefcase,label: 'Projets' },
    { to: '/notifications', icon: FiBell,     label: 'Notifications' },
    { to: '/profile',       icon: FiUser,     label: 'Mon profil' },
  ],
};

const roleLabels = { ROLE_STUDENT: 'Étudiant', ROLE_SUPERVISOR: 'Encadrant', ROLE_ADMIN: 'Admin' };
const roleColors = { ROLE_STUDENT: '#10b981', ROLE_SUPERVISOR: '#818cf8', ROLE_ADMIN: '#f59e0b' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    if (user?.role !== 'ROLE_ADMIN') {
      fetchUnread();
      const interval = setInterval(fetchUnread, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnread = async () => {
    try {
      const res = await getUnreadCounts();
      setUnreadTotal(res.data.data.total || 0);
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : '??';
  const items = navItems[user?.role] || [];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">PFE</div>
          {!collapsed && <span className="logo-text">Management</span>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      <div className="sidebar-user">
        <div className="avatar" style={{ background: `linear-gradient(135deg, ${roleColors[user?.role]}, #5b5fcf)` }}>
          {initials}
        </div>
        {!collapsed && (
          <div className="user-info">
            <div className="user-name">{user?.prenom} {user?.nom}</div>
            <div className="user-role" style={{ color: roleColors[user?.role] }}>
              {roleLabels[user?.role]}
            </div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {items.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? label : ''}
          >
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Icon className="nav-icon" />
              {badge && unreadTotal > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -8,
                  background: '#ef4444', color: 'white',
                  fontSize: 9, fontWeight: 700, borderRadius: 20,
                  padding: '1px 5px', lineHeight: 1.6, minWidth: 16, textAlign: 'center'
                }}>{unreadTotal > 99 ? '99+' : unreadTotal}</span>
              )}
            </span>
            {!collapsed && <span>{label}</span>}
            {!collapsed && badge && unreadTotal > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#ef4444', color: 'white',
                fontSize: 10, fontWeight: 700, borderRadius: 20,
                padding: '1px 7px', lineHeight: 1.6
              }}>{unreadTotal > 99 ? '99+' : unreadTotal}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <FiLogOut className="nav-icon" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
