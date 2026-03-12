import React, { useState, useEffect } from 'react';
import { FiBell, FiTrash2, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../services/api';

const typeColors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#0ea5e9' };
const typeIcons = { success: '', error: '', warning: '', info: '' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifs(); }, []);

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    toast.success('Toutes les notifications marquées comme lues');
  };

  const handleRead = async (id) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, lu: true } : n));
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
  };

  const unread = notifications.filter(n => !n.lu).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread} non lue(s)</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAll}>
            <FiCheck /> Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FiBell /></div>
            <div className="empty-state-title">Aucune notification</div>
          </div>
        ) : (
          <div>
            {notifications.map(n => (
              <div key={n._id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0',
                borderBottom: '1px solid #f1f5f9', background: n.lu ? 'transparent' : '#f8faff',
                borderRadius: n.lu ? 0 : 8, paddingLeft: n.lu ? 0 : 12
              }}>
                <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{typeIcons[n.type]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.lu ? 400 : 600, fontSize: 14, lineHeight: 1.5 }}>{n.message}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {!n.lu && (
                    <button onClick={() => handleRead(n._id)} className="btn btn-secondary btn-sm" title="Marquer comme lu">
                      <FiCheck size={13} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(n._id)} className="btn btn-danger btn-sm" title="Supprimer">
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
