import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiBookOpen, FiUser, FiUsers, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getSubjects, applyToSubject, getApplications } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SubjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [myApplications, setMyApplications] = useState([]);
  const [applyModal, setApplyModal] = useState(null);
  const [motivation, setMotivation] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchSubjects();
    if (user.role === 'ROLE_STUDENT') fetchMyApplications();
  }, [search, techFilter]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const params = { statut: 'validé' };
      if (search) params.search = search;
      if (techFilter) params.technology = techFilter;
      const res = await getSubjects(params);
      setSubjects(res.data.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des sujets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await getApplications();
      setMyApplications(res.data.data.map(a => a.sujetId?._id || a.sujetId).filter(Boolean));
    } catch {}
  };

  const handleApply = async () => {
    if (!motivation.trim()) { toast.error('Veuillez écrire une lettre de motivation'); return; }
    setApplying(true);
    try {
      await applyToSubject(applyModal._id, { motivation });
      toast.success('Candidature envoyée avec succès!');
      setApplyModal(null);
      setMotivation('');
      setMyApplications([...myApplications, applyModal._id]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la candidature');
    } finally {
      setApplying(false);
    }
  };

  const hasApplied = (subjectId) => myApplications.some(id => id?.toString() === subjectId?.toString());

  const getStatusColor = (statut) => {
    const colors = { validé: 'badge-success', proposé: 'badge-warning', refusé: 'badge-danger', complet: 'badge-gray' };
    return colors[statut] || 'badge-info';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sujets PFE</h1>
          <p className="page-subtitle">Découvrez les sujets disponibles et postulez</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="search-bar" style={{ maxWidth: 380 }}>
            <FiSearch className="search-icon" />
            <input type="text" className="search-input" placeholder="Rechercher un sujet..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Technologie</label>
            <input type="text" className="form-input" placeholder="ex: React, Python..."
              value={techFilter} onChange={e => setTechFilter(e.target.value)}
              style={{ width: 200 }} />
          </div>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); setTechFilter(''); }}>
            <FiFilter /> Réinitialiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div><span>Chargement...</span></div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">Aucun sujet trouvé</div>
          <div className="empty-state-text">Essayez avec d'autres filtres</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
          {subjects.map(subject => (
            <div key={subject._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span className={`badge ${getStatusColor(subject.statut)}`}>{subject.statut}</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.4, marginBottom: 8 }}>{subject.titre}</h3>
                </div>
                <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
                  <FiBookOpen size={20} color="white" />
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, flex: 1 }}>
                {subject.description.length > 150 ? subject.description.slice(0, 150) + '...' : subject.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {subject.technologies?.map(t => <span key={t} className="tag">{t}</span>)}
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--gray)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiUser size={13} /> {subject.encadrantId?.prenom} {subject.encadrantId?.nom}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiUsers size={13} /> Max {subject.nombreMaxEtudiants} étudiants
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/subjects/${subject._id}`)}
                  style={{ flex: 1 }}>Voir détails</button>
                {user.role === 'ROLE_STUDENT' && (
                  hasApplied(subject._id) ? (
                    <button className="btn btn-success btn-sm" disabled style={{ flex: 1 }}>
                      <FiCheck /> Candidaté
                    </button>
                  ) : subject.statut === 'validé' ? (
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                      onClick={() => setApplyModal(subject)}>
                      Postuler
                    </button>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Modal */}
      {applyModal && (
        <div className="modal-overlay" onClick={() => setApplyModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Postuler au sujet</h3>
              <button onClick={() => setApplyModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, marginBottom: 16 }}>
                <strong>{applyModal.titre}</strong>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
                  Encadrant: {applyModal.encadrantId?.prenom} {applyModal.encadrantId?.nom}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Lettre de motivation *</label>
                <textarea className="form-textarea" rows={5}
                  placeholder="Décrivez votre motivation, vos compétences et pourquoi vous souhaitez travailler sur ce sujet..."
                  value={motivation} onChange={e => setMotivation(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setApplyModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                {applying ? <><span className="btn-spinner"></span>Envoi...</> : 'Envoyer ma candidature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
