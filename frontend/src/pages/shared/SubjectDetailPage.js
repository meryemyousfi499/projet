import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiUsers, FiCalendar, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getSubjectById, applyToSubject, getApplications, getMyGroup } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SubjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [myGroup, setMyGroup] = useState(null);
  const [applyModal, setApplyModal] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchSubject();
    if (user.role === 'ROLE_STUDENT') { checkApplication(); checkGroup(); }
  }, [id]);

  const fetchSubject = async () => {
    try {
      const res = await getSubjectById(id);
      setSubject(res.data.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const checkGroup = async () => {
    try {
      const res = await getMyGroup();
      setMyGroup(res.data.data);
    } catch {}
  };

  const checkApplication = async () => {
    try {
      const res = await getApplications();
      setHasApplied(res.data.data.some(a => a.sujetId._id === id));
    } catch {}
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyToSubject(id, { motivation });
      toast.success('Candidature envoyée!');
      setApplyModal(false);
      setHasApplied(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setApplying(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!subject) return <div className="empty-state"><div className="empty-state-title">Sujet non trouvé</div></div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Retour
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span className={`badge ${subject.statut === 'validé' ? 'badge-success' : subject.statut === 'complet' ? 'badge-gray' : 'badge-warning'}`}>
                {subject.statut}
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>{subject.titre}</h1>
            <p style={{ color: 'var(--gray)', lineHeight: 1.8, fontSize: 15 }}>{subject.description}</p>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 14 }}>🛠️ Technologies requises</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {subject.technologies?.map(t => (
                <span key={t} className="tag" style={{ fontSize: 13, padding: '5px 14px' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 14 }}>📋 Informations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiUser color="#4f46e5" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 600, textTransform: 'uppercase' }}>Encadrant</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{subject.encadrantId?.prenom} {subject.encadrantId?.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>{subject.encadrantId?.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiUsers color="#10b981" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 600, textTransform: 'uppercase' }}>Équipe max</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{subject.nombreMaxEtudiants} étudiant(s)</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCalendar color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 600, textTransform: 'uppercase' }}>Proposé le</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{new Date(subject.createdAt).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            </div>
          </div>

          {user.role === 'ROLE_STUDENT' && subject.statut === 'validé' && (
            <div className="card" style={{ textAlign: 'center' }}>
              {hasApplied ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Candidature envoyée</div>
                  <div style={{ fontSize: 13, color: 'var(--gray)' }}>En attente de réponse de l'encadrant</div>
                </div>
              ) : !myGroup ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Vous devez avoir un groupe</div>
                  <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>
                    Créez ou rejoignez un groupe avant de postuler.
                  </div>
                  <a href="/group" className="btn btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                    Gérer mon groupe
                  </a>
                </div>
              ) : myGroup.chef?._id !== user._id && myGroup.chef !== user._id ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Seul le chef peut postuler</div>
                  <div style={{ fontSize: 13, color: 'var(--gray)' }}>
                    Demandez au chef de votre groupe de postuler.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Postuler avec votre groupe</div>
                  <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>
                    Groupe: <strong>{myGroup.nom}</strong> · {myGroup.membres?.length} membre(s)
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setApplyModal(true)}>
                    Postuler maintenant
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {applyModal && (
        <div className="modal-overlay" onClick={() => setApplyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Lettre de motivation</h3>
              <button onClick={() => setApplyModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Votre motivation *</label>
                <textarea className="form-textarea" rows={6}
                  placeholder="Expliquez pourquoi vous souhaitez travailler sur ce sujet..."
                  value={motivation} onChange={e => setMotivation(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setApplyModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={applying || !motivation.trim()}>
                {applying ? <><span className="btn-spinner"></span>Envoi...</> : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
