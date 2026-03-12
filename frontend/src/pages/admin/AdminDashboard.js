import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiBookOpen, FiBriefcase, FiClock, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiAward } from 'react-icons/fi';

export default function AdminDashboard({ data }) {
  const navigate = useNavigate();
  if (!data) return null;

  const stats = [
    { label: 'Total utilisateurs', value: data.totalUsers, icon: FiUsers, color: '#4f46e5', bg: '#e0e7ff' },
    { label: 'Étudiants', value: data.totalStudents, icon: FiUsers, color: '#10b981', bg: '#d1fae5' },
    { label: 'Encadrants', value: data.totalSupervisors, icon: FiUsers, color: '#0ea5e9', bg: '#dbeafe' },
    { label: 'Sujets proposés', value: data.pendingSubjects, icon: FiClock, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Projets actifs', value: data.activeProjects, icon: FiBriefcase, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Projets terminés', value: data.completedProjects, icon: FiCheckCircle, color: '#10b981', bg: '#d1fae5' },
    { label: 'Candidatures', value: data.pendingApplications, icon: FiAlertCircle, color: '#ef4444', bg: '#fee2e2' },
    { label: 'Note moyenne', value: `${data.avgGrade}/20`, icon: FiAward, color: '#f59e0b', bg: '#fef3c7' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"> Dashboard Admin</h1>
          <p className="page-subtitle">Vue d'ensemble de la plateforme PFE</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Projets récents</h3>
          {data.recentProjects?.length === 0 ? (
            <div className="empty-state"><div className="empty-state-text">Aucun projet</div></div>
          ) : (
            <div>
              {data.recentProjects?.map(p => (
                <div key={p._id} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${p._id}`)}>
                  <div className="avatar" style={{ background: 'linear-gradient(135deg,#4f46e5,#0ea5e9)' }}>
                    {p.sujetId?.titre?.[0] || 'P'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.sujetId?.titre}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                      {p.etudiants?.map(e => `${e.prenom} ${e.nom}`).join(', ')}
                    </div>
                  </div>
                  <div className="progress-bar" style={{ width: 60 }}>
                    <div className="progress-fill" style={{ width: `${p.progression}%` }}></div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--gray)', width: 35, textAlign: 'right' }}>{p.progression}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}> Répartition par département</h3>
          {data.projectsByDept?.length === 0 ? (
            <div className="empty-state"><div className="empty-state-text">Aucune donnée</div></div>
          ) : (
            <div>
              {data.projectsByDept?.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--gray)', width: 120, flexShrink: 0 }}>{d._id || 'N/A'}</span>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, (d.count / data.totalSupervisors) * 100)}%` }}></div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: 'right' }}>{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, fontWeight: 700 }}> Actions rapides</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/users')}> Gérer les utilisateurs</button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin-subjects')}>Valider les sujets {data.pendingSubjects > 0 && `(${data.pendingSubjects})`}</button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin-projects')}> Voir tous les projets</button>
        </div>
      </div>
    </div>
  );
}
