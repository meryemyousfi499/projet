import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProjects } from '../../services/api';

export default function AdminProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchProjects(); }, [filter]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await getProjects({ statut: filter || undefined });
      setProjects(res.data.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tous les Projets</h1>
          <p className="page-subtitle">{projects.length} projet(s)</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'en cours', 'terminé'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
              {s || 'Tous'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>Sujet</th><th>Étudiants</th><th>Encadrant</th><th>Progression</th><th>Statut</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>Aucun projet</td></tr>
                ) : projects.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600, fontSize: 14, maxWidth: 250 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.sujetId?.titre}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.etudiants?.map(e => `${e.prenom} ${e.nom}`).join(', ')}</td>
                    <td style={{ fontSize: 13 }}>{p.encadrantId?.prenom} {p.encadrantId?.nom}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-fill" style={{ width: `${p.progression}%` }}></div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{p.progression}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${p.statut === 'en cours' ? 'badge-info' : 'badge-success'}`}>{p.statut}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${p._id}`)}>
                        <FiEye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
