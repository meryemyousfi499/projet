import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiBriefcase, FiClock, FiActivity } from 'react-icons/fi';

export default function SupervisorDashboard({ data }) {
  const navigate = useNavigate();
  if (!data) return null;

  const stats = [
    { label: 'Mes sujets', value: data.mySubjects, icon: FiBookOpen, color: '#4f46e5', bg: '#e0e7ff' },
    { label: 'Projets actifs', value: data.activeProjects, icon: FiActivity, color: '#10b981', bg: '#d1fae5' },
    { label: 'Total projets', value: data.myProjects, icon: FiBriefcase, color: '#0ea5e9', bg: '#dbeafe' },
    { label: 'Candidatures en attente', value: data.pendingApplications, icon: FiClock, color: '#f59e0b', bg: '#fef3c7' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Espace Encadrant</h1>
          <p className="page-subtitle">Gérez vos sujets et projets</p>
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
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Mes projets récents</h3>
          {data.recentProjects?.length === 0 ? (
            <div className="empty-state"><div className="empty-state-text">Aucun projet</div></div>
          ) : data.recentProjects?.map(p => (
            <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
              onClick={() => navigate(`/projects/${p._id}`)}>
              <div className="avatar">{p.sujetId?.titre?.[0] || 'P'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.sujetId?.titre}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                  {p.etudiants?.map(e => `${e.prenom} ${e.nom}`).join(', ')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.progression}%</div>
                <div className="progress-bar" style={{ width: 60, marginTop: 4 }}>
                  <div className="progress-fill" style={{ width: `${p.progression}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Actions rapides</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate('/my-subjects')}>Proposer un sujet</button>
            <button className="btn btn-secondary" onClick={() => navigate('/applications-review')}>
              Candidatures en attente {data.pendingApplications > 0 && `(${data.pendingApplications})`}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/supervisor-projects')}>Mes projets</button>
          </div>
        </div>
      </div>
    </div>
  );
}
