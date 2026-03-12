import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiBriefcase, FiAward, FiBook } from 'react-icons/fi';

import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';

export default function StudentDashboard({ data }) {
  const navigate = useNavigate();
  if (!data) return null;

  const getGradeColor = (note) => {
    if (note >= 16) return '#10b981';
    if (note >= 12) return '#0ea5e9';
    if (note >= 10) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div>
      <PageHeader
        title="Espace Étudiant"
        subtitle="Suivez votre progression"
      />

      <div className="stats-grid">
        <StatCard
          icon={FiClipboard}
          iconBg="#e0e7ff"
          iconColor="#4f46e5"
          value={data.myApplications}
          label="Candidatures"
        />
        <StatCard
          icon={FiBriefcase}
          iconBg={data.myProject ? '#d1fae5' : '#f1f5f9'}
          iconColor={data.myProject ? '#10b981' : '#94a3b8'}
          value={data.myProject ? '✓' : '—'}
          label="Mon projet"
        />
        <StatCard
          icon={FiAward}
          iconBg={data.evaluation ? '#fef3c7' : '#f1f5f9'}
          iconColor={data.evaluation ? '#f59e0b' : '#94a3b8'}
          value={data.evaluation?.noteFinale != null ? `${data.evaluation.noteFinale}/20` : '—'}
          label="Note finale"
        />
      </div>

      {data.myProject ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <div>
              <h3 className="page-title" style={{ fontSize: 20 }}>Mon projet actuel</h3>
              <p className="page-subtitle" style={{ marginTop: 4 }}>{data.myProject.sujetId?.titre}</p>
              <div className="tag-container">
                {data.myProject.sujetId?.technologies?.map(t => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => navigate(`/projects/${data.myProject._id}`)}>
              Voir le projet
            </button>
          </div>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="font-semibold" style={{ fontSize: 14 }}>Progression</span>
              <span className="font-bold text-primary" style={{ fontSize: 14 }}>{data.myProject.progression}%</span>
            </div>
            <div className="progress-bar" style={{ height: 12 }}>
              <div className="progress-fill" style={{ width: `${data.myProject.progression}%` }}></div>
            </div>
          </div>

          <div className="flex gap-4 text-sm text-gray">
            <div>Encadrant: <strong>{data.myProject.encadrantId?.prenom} {data.myProject.encadrantId?.nom}</strong></div>
            <div>📧 {data.myProject.encadrantId?.email}</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <EmptyState
            icon={FiBook}
            title="Pas encore de projet"
            text="Explorez les sujets disponibles et postulez"
            action={
              <button className="btn btn-primary" onClick={() => navigate('/subjects')}>Voir les sujets</button>
            }
          />
        </div>
      )}

      <div className="card">
        <h3 className="page-title" style={{ fontSize: 18, marginBottom: 16 }}>Actions rapides</h3>
        <div className="actions-bar">
          <button className="btn btn-primary" onClick={() => navigate('/subjects')}>Explorer les sujets</button>
          <button className="btn btn-secondary" onClick={() => navigate('/my-applications')}>Mes candidatures</button>
          {data.myProject && <button className="btn btn-secondary" onClick={() => navigate('/my-project')}>Mon projet</button>}
        </div>
      </div>
    </div>
  );
}
