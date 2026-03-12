import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProjects } from '../../services/api';

export default function SupervisorProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects().then(res => setProjects(res.data.data)).catch(() => toast.error('Erreur')).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes Projets</h1>
          <p className="page-subtitle">{projects.length} projet(s) encadré(s)</p>
        </div>
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner"></div></div> :
      projects.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📂</div><div className="empty-state-title">Aucun projet</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
          {projects.map(p => (
            <div key={p._id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p._id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className={`badge ${p.statut === 'en cours' ? 'badge-info' : 'badge-success'}`}>{p.statut}</span>
                <button className="btn btn-secondary btn-sm"><FiEye size={13} /></button>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, lineHeight: 1.4 }}>{p.sujetId?.titre}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {p.sujetId?.technologies?.slice(0, 4).map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {p.etudiants?.map(e => (
                  <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                      {`${e.prenom?.[0] || ''}${e.nom?.[0] || ''}`.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12 }}>{e.prenom} {e.nom}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span>Progression</span><span style={{ fontWeight: 700 }}>{p.progression}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${p.progression}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
