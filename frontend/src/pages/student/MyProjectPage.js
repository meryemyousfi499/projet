import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProjects } from '../../services/api';

export default function MyProjectPage() {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects().then(res => {
      setProject(res.data.data[0] || null);
    }).catch(() => toast.error('Erreur')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  if (!project) return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Mon Projet</h1></div></div>
      <div className="empty-state">
        <div className="empty-state-icon"><FiBookOpen /></div>
        <div className="empty-state-title">Pas encore de projet</div>
        <div className="empty-state-text">Postulez à un sujet pour démarrer votre projet PFE</div>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={() => navigate('/subjects')}>Voir les sujets</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mon Projet</h1>
          <p className="page-subtitle">{project.sujetId?.titre}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/projects/${project._id}`)}>
          Accéder au projet complet
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Informations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span style={{ fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>Titre</span>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{project.sujetId?.titre}</div>
              </div>
              <div><span style={{ fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>Description</span>
                <div style={{ fontSize: 14, color: 'var(--gray)', marginTop: 2, lineHeight: 1.6 }}>{project.sujetId?.description}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>Technologies</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {project.sujetId?.technologies?.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
              <div><span style={{ fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>Encadrant</span>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{project.encadrantId?.prenom} {project.encadrantId?.nom}</div>
                <div style={{ fontSize: 13, color: 'var(--gray)' }}>{project.encadrantId?.email}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}> Progression</h3>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--primary)' }}>{project.progression}%</div>
              <div className="progress-bar" style={{ height: 12, marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${project.progression}%` }}></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--gray)' }}>
              <span>Démarré</span>
              <span style={{ fontWeight: 600, color: project.statut === 'en cours' ? '#0ea5e9' : '#10b981' }}>{project.statut}</span>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/projects/${project._id}`)}>
            Voir les étapes, livrables et notes
          </button>
        </div>
      </div>
    </div>
  );
}
