import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiUserPlus, FiTrash2, FiLogOut, FiCheck, FiX, FiMail, FiSend, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getMyGroup, getMyInvitations, createGroup, inviteMember,
  respondInvitation, leaveGroup, deleteGroup, removeMember,
  getApplications
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Avatar = ({ user, size = 40 }) => {
  const init = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #5b5fcf, #818cf8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0
    }}>{init}</div>
  );
};

export default function GroupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup]             = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [groupName, setGroupName]     = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [processing, setProcessing]   = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [gRes, iRes, aRes] = await Promise.all([
        getMyGroup().catch(() => ({ data: { data: null } })),
        getMyInvitations().catch(() => ({ data: { data: [] } })),
        getApplications().catch(() => ({ data: { data: [] } })),
      ]);
      setGroup(gRes.data.data);
      setInvitations(iRes.data.data);
      setApplications(aRes.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setProcessing(true);
    try {
      const res = await createGroup({ nom: groupName.trim() });
      setGroup(res.data.data);
      setCreateModal(false);
      setGroupName('');
      toast.success('Groupe créé!');
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Erreur serveur - vérifiez que le backend est démarré'); }
    finally { setProcessing(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setProcessing(true);
    try {
      await inviteMember({ email: inviteEmail.trim() });
      setInviteModal(false);
      setInviteEmail('');
      toast.success('Invitation envoyée!');
      fetchAll(); // refetch full group to preserve isChef state
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Erreur serveur - vérifiez que le backend est démarré'); }
    finally { setProcessing(false); }
  };

  const handleRespond = async (groupId, statut) => {
    setProcessing(true);
    try {
      await respondInvitation(groupId, { statut });
      toast.success(statut === 'accepté' ? 'Vous avez rejoint le groupe!' : 'Invitation refusée');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Erreur serveur - vérifiez que le backend est démarré'); }
    finally { setProcessing(false); }
  };

  const handleLeave = async () => {
    if (!window.confirm('Quitter le groupe?')) return;
    setProcessing(true);
    try {
      await leaveGroup();
      setGroup(null);
      toast.success('Vous avez quitté le groupe.');
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Erreur serveur - vérifiez que le backend est démarré'); }
    finally { setProcessing(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement le groupe?')) return;
    setProcessing(true);
    try {
      await deleteGroup();
      setGroup(null);
      toast.success('Groupe supprimé.');
      await fetchAll(); // refetch to confirm group is gone
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Erreur serveur - vérifiez que le backend est démarré'); }
    finally { setProcessing(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Retirer ce membre?')) return;
    setProcessing(true);
    try {
      await removeMember(userId);
      toast.success('Membre retiré');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Erreur serveur - vérifiez que le backend est démarré'); }
    finally { setProcessing(false); }
  };

  const userId = user?._id?.toString() || user?.id?.toString();
  const isChef = userId && (
    group?.chef?._id?.toString() === userId ||
    group?.chef?.toString() === userId
  );
  const pendingInvites = group?.invitations?.filter(i => i.statut === 'en attente') || [];

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mon Groupe</h1>
          <p className="page-subtitle">Gérez votre équipe et postulez aux sujets</p>
        </div>
        {!group && (
          <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
            <FiUsers /> Créer un groupe
          </button>
        )}
      </div>

      {/* Pending invitations to me */}
      {invitations.length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: '2px solid #5b5fcf', background: '#f5f5ff' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, color: '#5b5fcf' }}> Invitations reçues</h3>
          {invitations.map(g => (
            <div key={g._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e4e6f1' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Groupe: <strong>{g.nom}</strong></div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  Chef: {g.chef?.prenom} {g.chef?.nom} · {g.membres?.length} membre(s)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success btn-sm" disabled={processing} onClick={() => handleRespond(g._id, 'accepté')}>
                  <FiCheck /> Accepter
                </button>
                <button className="btn btn-secondary btn-sm" disabled={processing} onClick={() => handleRespond(g._id, 'refusé')}>
                  <FiX /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No group yet */}
      {!group && invitations.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}></div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Vous n'avez pas encore de groupe</div>
          <div style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
            Créez un groupe, invitez vos coéquipiers, puis postulez ensemble à un sujet PFE.
          </div>
          <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
            Créer mon groupe
          </button>
        </div>
      )}

      {/* Group panel */}
      {group && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Members */}
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1d3b' }}>{group.nom}</h2>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span className="badge badge-purple">{group.membres?.length} membre(s)</span>
                    {isChef && <span style={{ fontSize: 12, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}> Chef</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isChef && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => setInviteModal(true)}>
                        <FiUserPlus /> Inviter
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={processing}>
                        <FiTrash2 /> Supprimer
                      </button>
                    </>
                  )}
                  {!isChef && (
                    <button className="btn btn-secondary btn-sm" onClick={handleLeave} disabled={processing}>
                      <FiLogOut /> Quitter
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.membres?.map(m => {
                  const isMemberChef = m._id === (group.chef?._id || group.chef);
                  return (
                    <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#f5f6fb', borderRadius: 12 }}>
                      <Avatar user={m} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {m.prenom} {m.nom}
                          {isMemberChef && <span style={{ marginLeft: 8, fontSize: 12, color: '#f59e0b' }}> Chef</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{m.email} · {m.departement || 'N/A'}</div>
                      </div>
                      {isChef && !isMemberChef && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleRemoveMember(m._id)} title="Retirer">
                          <FiX size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pending invitations sent by chef */}
              {isChef && pendingInvites.length > 0 && (
                <div style={{ marginTop: 20, padding: '14px 16px', background: '#fffbeb', borderRadius: 10, border: '1px dashed #f59e0b' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}> Invitations en attente</div>
                  {pendingInvites.map(inv => (
                    <div key={inv._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <FiMail size={13} color="#92400e" />
                      <span style={{ fontSize: 13 }}>{inv.userId?.prenom} {inv.userId?.nom} — {inv.userId?.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Candidatures du groupe */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700 }}>Candidatures du groupe</h3>
                {isChef && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/subjects')}>
                    + Postuler à un sujet
                  </button>
                )}
              </div>
              {applications.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>
                  <div className="empty-state-icon"></div>
                  <div className="empty-state-title">Aucune candidature</div>
                  {isChef && (
                    <div style={{ marginTop: 12 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/subjects')}>Voir les sujets</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {applications.map(app => {
                    const statusStyle = {
                      'en attente': { bg: '#fef3c7', color: '#92400e', label: ' En attente' },
                      'accepté':    { bg: '#d1fae5', color: '#065f46', label: ' Accepté' },
                      'refusé':     { bg: '#fee2e2', color: '#991b1b', label: ' Refusé' },
                    }[app.statut] || {};
                    return (
                      <div key={app._id} style={{ padding: '14px 16px', background: '#f5f6fb', borderRadius: 12, border: `1px solid ${statusStyle.bg || '#e4e6f1'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{app.sujetId?.titre}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {app.sujetId?.technologies?.slice(0, 4).map(t => <span key={t} className="tag">{t}</span>)}
                            </div>
                          </div>
                          <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {statusStyle.label}
                          </span>
                        </div>
                        {app.commentaireEncadrant && (
                          <div style={{ marginTop: 10, padding: '8px 12px', background: 'white', borderRadius: 8, fontSize: 13, color: '#374151', border: '1px solid #e4e6f1' }}>
                             <em>{app.commentaireEncadrant}</em>
                          </div>
                        )}
                        {app.statut === 'accepté' && (
                          <div style={{ marginTop: 10 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/my-project')}>
                              <FiBriefcase size={13} /> Voir le projet
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Info panel */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Guide du groupe</h4>
              {[
                { step: '1', color: '#5b5fcf', label: 'Créer le groupe', done: true },
                { step: '2', color: '#10b981', label: 'Inviter les membres', done: group.membres?.length > 1 },
                { step: '3', color: '#f59e0b', label: 'Postuler à un sujet', done: applications.length > 0 },
                { step: '4', color: '#ef4444', label: 'Attendre validation', done: applications.some(a => a.statut === 'accepté') },
                { step: '5', color: '#0ea5e9', label: 'Démarrer le projet', done: applications.some(a => a.statut === 'accepté') },
              ].map(({ step, color, label, done }) => (
                <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? color : '#e4e6f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? 'white' : '#9ca3af', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {done ? '✓' : step}
                  </div>
                  <span style={{ fontSize: 13, color: done ? '#1a1d3b' : '#9ca3af', fontWeight: done ? 600 : 400 }}>{label}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ background: '#eeeffe', border: '1px solid #c7d2fe' }}>
              <div style={{ fontSize: 13, color: '#3730a3', lineHeight: 1.7 }}>
                <strong>Comment ça marche ?</strong><br /><br />
                1. Le chef crée le groupe et invite des coéquipiers par email.<br />
                2. Les membres acceptent l'invitation.<br />
                3. Le chef postule à un sujet au nom du groupe.<br />
                4. L'encadrant valide ou refuse la candidature.<br />
                5. Si accepté, tous les membres ont accès au projet et peuvent <strong>communiquer ensemble avec l'encadrant</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Créer un groupe</h3>
              <button onClick={() => setCreateModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom du groupe *</label>
                <input className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)}
                  placeholder="Ex: Équipe Alpha, Dev4PFE..." />
              </div>
              <div style={{ padding: '12px 16px', background: '#eeeffe', borderRadius: 8, fontSize: 13, color: '#3730a3' }}>
                 Vous serez automatiquement le chef du groupe.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={processing || !groupName.trim()}>
                {processing ? <><span className="btn-spinner"></span>Création...</> : <><FiUsers /> Créer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteModal && (
        <div className="modal-overlay" onClick={() => setInviteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Inviter un membre</h3>
              <button onClick={() => setInviteModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Email de l'étudiant *</label>
                <input className="form-input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="etudiant@email.com" />
              </div>
              <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#065f46' }}>
                 L'étudiant recevra une notification et pourra accepter ou refuser.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setInviteModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleInvite} disabled={processing || !inviteEmail.trim()}>
                {processing ? <><span className="btn-spinner"></span>Envoi...</> : <><FiSend /> Envoyer l'invitation</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}