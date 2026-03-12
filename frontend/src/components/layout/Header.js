import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiSearch, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markAllAsRead, markAsRead } from '../../services/api';
import './Header.css';

export default function Header({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.data.slice(0, 10));
      setUnreadCount(res.data.unreadCount);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    } catch {}
  };

  const handleNotifClick = async (notif) => {
    if (!notif.lu) {
      await markAsRead(notif._id);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, lu: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.lien) {
      navigate(notif.lien);
      setShowNotifs(false);
    }
  };

  const getNotifStyle = (type) => {
    const styles = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#0ea5e9' };
    return styles[type] || '#0ea5e9';
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-search">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Rechercher..." className="header-search-input" />
        </div>
      </div>

      <div className="header-right">
        <div className="notif-wrapper" ref={notifRef}>
          <button className="header-btn notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
            <FiBell size={20} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="mark-all-btn">Tout lire</button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">Aucune notification</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      className={`notif-item ${!n.lu ? 'unread' : ''}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="notif-dot" style={{ background: getNotifStyle(n.type) }}></div>
                      <div className="notif-content">
                        <p className="notif-message">{n.message}</p>
                        <span className="notif-time">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="notif-footer">
                <button onClick={() => { navigate('/notifications'); setShowNotifs(false); }}>
                  Voir tout
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="header-user" onClick={() => navigate('/profile')}>
          <div className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
            {`${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase()}
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{user?.prenom} {user?.nom}</span>
            <span className="header-user-dept">{user?.departement || 'N/A'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
