import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiSearch, FiEye, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getSubjects, validateSubject, deleteSubject } from '../../services/api';

const statusMap = { proposé: 'badge-warning', validé: 'badge-success', refusé: 'badge-danger', complet: 'badge-gray' };

export default function AdminSubjectsPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('proposé');
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => { fetchSubjects(); }, [filter, search]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await getSubjects({ statut: filter || undefined, search });
      setSubjects(res.data.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const handleValidate = async (id) => {
    try {
      await validateSubject(id, { statut: 'validé' });
      toast.success('Sujet validé!');
      fetchSubjects();
    } catch { toast.error('Erreur'); }
  };

  const handleReject = async () => {
    try {
      await validateSubject(rejectModal, { statut: 'refusé', commentaireAdmin: rejectComment });
      toast.success('Sujet refusé');
      setRejectModal(null);
      setRejectComment('');
      fetchSubjects();
    } catch { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce sujet?')) return;
    try { await deleteSubject(id); toast.success('Supprimé'); fetchSubjects(); } catch { toast.error('Erreur'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"> Gestion des Sujets</h1>
          <p className="page-subtitle">Validez et gérez les sujets PFE</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input type="text" className="search-input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['', 'proposé', 'validé', 'refusé', 'complet'].map(s => (
              <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(s)}>
                {s || 'Tous'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>Titre</th><th>Encadrant</th><th>Technologies</th><th>Statut</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {subjects.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>Aucun sujet</td></tr>
                ) : subjects.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s.titre}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.description}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{s.encadrantId?.prenom} {s.encadrantId?.nom}</td>
                    <td><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{s.technologies?.slice(0, 3).map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}</div></td>
                    <td><span className={`badge ${statusMap[s.statut]}`}>{s.statut}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--gray)' }}>{new Date(s.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/subjects/${s._id}`)}><FiEye size={13} /></button>
                        {s.statut === 'proposé' && <>
                          <button className="btn btn-success btn-sm" onClick={() => handleValidate(s._id)} title="Valider"><FiCheck size={13} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectModal(s._id)} title="Refuser"><FiX size={13} /></button>
                        </>}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Refuser le sujet</h3>
              <button onClick={() => setRejectModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Raison du refus</label>
                <textarea className="form-textarea" rows={4} value={rejectComment}
                  onChange={e => setRejectComment(e.target.value)}
                  placeholder="Expliquez pourquoi ce sujet est refusé..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={handleReject}><FiX /> Refuser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
