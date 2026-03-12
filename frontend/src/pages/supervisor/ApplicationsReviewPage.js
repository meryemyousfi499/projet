import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApplications, updateApplication } from '../../services/api';

const statusStyle = {
  'en attente': { cls: 'badge-warning', label: 'En attente' },
  'accepté':    { cls: 'badge-success', label: 'Accepté' },
  'refusé':     { cls: 'badge-danger',  label: 'Refusé' },
};

export default function ApplicationsReviewPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('en attente');
  const [reviewModal, setReviewModal] = useState(null);
  const [comment, setComment]     = useState('');
  const [action, setAction]       = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchApplications(); }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await getApplications({ statut: filter || undefined });
      setApplications(res.data.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const openReview = (app, act) => {
    setReviewModal(app); setAction(act); setComment('');
  };

  const handleReview = async () => {
    setProcessing(true);
    try {
      await updateApplication(reviewModal._id, { statut: action, commentaireEncadrant: comment });
      toast.success(action === 'accepté' ? '🎉 Candidature acceptée! Projet créé pour tout le groupe!' : 'Candidature refusée');
      setReviewModal(null);
      fetchApplications();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setProcessing(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidatures</h1>
          <p className="page-subtitle">Les candidatures sont soumises par groupe</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'en attente', 'accepté', 'refusé'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
              {s || 'Toutes'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner"></div></div> :
      applications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">Aucune candidature</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {applications.map(app => {
            const ss = statusStyle[app.statut] || {};
            const group = app.groupId;
            return (
              <div key={app._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eeeffe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiUsers color="#5b5fcf" size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1d3b' }}>
                        {group?.nom || 'Groupe inconnu'}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                        Chef: <strong>{group?.chef?.prenom} {group?.chef?.nom}</strong> · {group?.membres?.length} membre(s) · {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${ss.cls}`}>{ss.label}</span>
                </div>

                {/* Subject */}
                <div style={{ padding: '10px 14px', background: '#f5f6fb', borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Sujet demandé</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{app.sujetId?.titre}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {app.sujetId?.technologies?.slice(0, 5).map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>

                {/* Group members */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Membres du groupe</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {group?.membres?.map(m => (
                      <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#eeeffe', borderRadius: 20 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#5b5fcf', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 700 }}>
                          {`${m.prenom?.[0]||''}${m.nom?.[0]||''}`.toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{m.prenom} {m.nom}</span>
                        {m._id === (group.chef?._id || group.chef) && (
                          <span style={{ fontSize: 10, color: '#f59e0b' }}>Chef</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Motivation */}
                {app.motivation && (
                  <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#374151', marginBottom: 12, borderLeft: '3px solid #f59e0b' }}>
                    <strong>Motivation:</strong> {app.motivation}
                  </div>
                )}

                {/* Comment from supervisor */}
                {app.commentaireEncadrant && (
                  <div style={{ padding: '10px 14px', background: app.statut === 'accepté' ? '#f0fdf4' : '#fef2f2', borderRadius: 8, fontSize: 13, marginBottom: 12, borderLeft: `3px solid ${app.statut === 'accepté' ? '#10b981' : '#ef4444'}` }}>
                    <strong>Votre réponse:</strong> {app.commentaireEncadrant}
                  </div>
                )}

                {app.statut === 'en attente' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => openReview(app, 'accepté')}>
                      <FiCheck /> Accepter le groupe
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => openReview(app, 'refusé')}>
                      <FiX /> Refuser
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{action === 'accepté' ? '✅ Accepter' : '❌ Refuser'} la candidature</h3>
              <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              {action === 'accepté' && (
                <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#065f46' }}>
                  🎉 Un projet sera automatiquement créé pour <strong>tous les membres</strong> du groupe "{reviewModal.groupId?.nom}".
                  Ils pourront tous accéder au projet, aux messages et aux fichiers.
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Commentaire {action === 'refusé' ? '(raison du refus)' : '(optionnel)'}</label>
                <textarea className="form-textarea" rows={4} value={comment} onChange={e => setComment(e.target.value)}
                  placeholder={action === 'accepté' ? 'Message de bienvenue...' : 'Expliquez pourquoi la candidature est refusée...'} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Annuler</button>
              <button className={`btn ${action === 'accepté' ? 'btn-success' : 'btn-danger'}`} onClick={handleReview} disabled={processing}>
                {processing ? <><span className="btn-spinner"></span>Traitement...</> : action === 'accepté' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
