import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiPlus, FiTrash2, FiEdit2, FiDownload, FiCheck, FiClock, FiCircle, FiSend, FiPaperclip, FiFile, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getProjectById, getMilestones, updateMilestone, createMilestone, deleteMilestone,
  getDeliverables, uploadDeliverable, deleteDeliverable, getEvaluation, createOrUpdateEvaluation, getMessages, sendMessage, sendFile
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const statusIcon = { 'à faire': <FiCircle color="#94a3b8" />, 'en cours': <FiClock color="#f59e0b" />, 'terminé': <FiCheck color="#10b981" /> };
const statusColors = { 'à faire': '#f1f5f9', 'en cours': '#fef3c7', 'terminé': '#d1fae5' };
const statusTextColors = { 'à faire': '#64748b', 'en cours': '#92400e', 'terminé': '#065f46' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('milestones');
  const [uploadModal, setUploadModal] = useState(false);
  const [evalModal, setEvalModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [uploadForm, setUploadForm] = useState({ type: 'rapport', titre: '', version: '1.0', commentaire: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [evalForm, setEvalForm] = useState({ noteEncadrant: '', noteJury: '', commentaireEncadrant: '', commentaireJury: '' });
  // Messages state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatFileUploading, setChatFileUploading] = useState(false);
  const chatBottomRef = useRef(null);
  const chatFileRef = useRef(null);
  const chatPollRef = useRef(null);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, mRes, dRes, eRes] = await Promise.all([
        getProjectById(id), getMilestones(id), getDeliverables(id), getEvaluation(id)
      ]);
      setProject(pRes.data.data);
      setMilestones(mRes.data.data);
      setDeliverables(dRes.data.data);
      setEvaluation(eRes.data.data);
      if (eRes.data.data) {
        setEvalForm({
          noteEncadrant: eRes.data.data.noteEncadrant || '',
          noteJury: eRes.data.data.noteJury || '',
          commentaireEncadrant: eRes.data.data.commentaireEncadrant || '',
          commentaireJury: eRes.data.data.commentaireJury || ''
        });
      }
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const handleMilestoneStatus = async (milestone) => {
    let nextStatus;
    if (milestone._forceStatus) {
      // Called from dropdown with explicit status
      nextStatus = milestone.statut;
    } else {
      // Called from click cycle (legacy)
      const order = ['à faire', 'en cours', 'terminé'];
      nextStatus = order[(order.indexOf(milestone.statut) + 1) % order.length];
    }
    try {
      await updateMilestone(milestone._id, { statut: nextStatus });
      const res = await getMilestones(id);
      setMilestones(res.data.data);
      const pRes = await getProjectById(id);
      setProject(pRes.data.data);
    } catch { toast.error('Erreur'); }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.trim()) return;
    try {
      await createMilestone(id, { nomEtape: newMilestone });
      setNewMilestone('');
      const res = await getMilestones(id);
      setMilestones(res.data.data);
      toast.success('Étape ajoutée!');
    } catch { toast.error('Erreur'); }
  };

  const handleDeleteMilestone = async (mId) => {
    if (!window.confirm('Supprimer cette étape?')) return;
    try {
      await deleteMilestone(mId);
      const res = await getMilestones(id);
      setMilestones(res.data.data);
      const pRes = await getProjectById(id);
      setProject(pRes.data.data);
      toast.success('Étape supprimée');
    } catch { toast.error('Erreur'); }
  };

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Veuillez sélectionner un fichier'); return; }
    if (!uploadForm.titre) { toast.error('Titre requis'); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    Object.entries(uploadForm).forEach(([k, v]) => formData.append(k, v));
    try {
      await uploadDeliverable(id, formData);
      toast.success('Livrable uploadé!');
      setUploadModal(false);
      setUploadFile(null);
      setUploadForm({ type: 'rapport', titre: '', version: '1.0', commentaire: '' });
      const dRes = await getDeliverables(id);
      setDeliverables(dRes.data.data);
    } catch { toast.error('Erreur upload'); } finally { setUploading(false); }
  };

  const handleDeleteDeliverable = async (dId) => {
    if (!window.confirm('Supprimer ce livrable?')) return;
    try {
      await deleteDeliverable(dId);
      const dRes = await getDeliverables(id);
      setDeliverables(dRes.data.data);
      toast.success('Livrable supprimé');
    } catch { toast.error('Erreur'); }
  };

  const handleSaveEval = async () => {
    try {
      await createOrUpdateEvaluation(id, evalForm);
      toast.success('Évaluation sauvegardée!');
      const eRes = await getEvaluation(id);
      setEvaluation(eRes.data.data);
      setEvalModal(false);
    } catch { toast.error('Erreur'); }
  };

  // ── Chat handlers ──────────────────────────────────────────────
  const loadChatMessages = async (showLoader = true) => {
    try {
      const res = await getMessages(id);
      setChatMessages(res.data.data || []);
      if (showLoader) setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      loadChatMessages(true);
      chatPollRef.current = setInterval(() => loadChatMessages(false), 5000);
    } else {
      clearInterval(chatPollRef.current);
    }
    return () => clearInterval(chatPollRef.current);
  }, [activeTab, id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSend = async () => {
    if (!chatText.trim() || chatSending) return;
    setChatSending(true);
    try {
      const res = await sendMessage(id, { content: chatText.trim() });
      setChatMessages(prev => [...prev, res.data.data]);
      setChatText('');
    } catch { toast.error('Erreur envoi message'); }
    finally { setChatSending(false); }
  };

  const handleChatFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop grand (max 20MB)'); return; }
    setChatFileUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await sendFile(id, formData);
      setChatMessages(prev => [...prev, res.data.data]);
      toast.success('Fichier envoyé!');
    } catch { toast.error('Erreur upload fichier'); }
    finally { setChatFileUploading(false); e.target.value = ''; }
  };

  const formatMsgTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };
  // ──────────────────────────────────────────────────────────────

  const userId = user?._id?.toString() || user?.id?.toString();
  const canEdit = user.role === 'ROLE_ADMIN' || (project && (project.encadrantId?._id?.toString() === userId || project.encadrantId?.toString() === userId));

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!project) return <div className="empty-state"><div className="empty-state-title">Projet non trouvé</div></div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}><FiArrowLeft /> Retour</button>
      </div>

      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <span className={`badge ${project.statut === 'en cours' ? 'badge-info' : 'badge-success'}`}>{project.statut}</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{project.sujetId?.titre}</h1>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--gray)' }}>
              <div>Encadrant: <strong>{project.encadrantId?.prenom} {project.encadrantId?.nom}</strong></div>
              <div>👥 {project.etudiants?.map(e => `${e.prenom} ${e.nom}`).join(', ')}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{project.progression}%</div>
            <div className="progress-bar" style={{ width: 100, height: 10 }}>
              <div className="progress-fill" style={{ width: `${project.progression}%` }}></div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>Progression</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {project.sujetId?.technologies?.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'milestones', label: 'Avancement' },
          { key: 'deliverables', label: 'Livrables' },
          { key: 'messages', label: '💬 Discussion' },
          { key: 'evaluation', label: '⭐ Évaluation' },
        ].map(t => (
          <button key={t.key} className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.key)} style={{ border: 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Milestones */}
      {activeTab === 'milestones' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>Étapes du projet</h3>
            <span className="badge badge-info">{milestones.filter(m => m.statut === 'terminé').length}/{milestones.length} terminées</span>
          </div>
          <div className="timeline">
            {milestones.map(m => (
              <div key={m._id} className="timeline-item">
                <div className={`timeline-dot ${m.statut === 'terminé' ? 'done' : m.statut === 'en cours' ? 'active' : 'pending'}`}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 20 }}>{statusIcon[m.statut]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nomEtape}</div>
                    {m.commentaire && <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{m.commentaire}</div>}
                  </div>
                  {canEdit ? (
                    <select
                      value={m.statut}
                      onChange={e => handleMilestoneStatus({ ...m, statut: e.target.value, _forceStatus: true })}
                      style={{
                        padding: '4px 10px', borderRadius: 8, border: '1px solid #e4e6f1',
                        background: statusColors[m.statut], color: statusTextColors[m.statut],
                        fontWeight: 600, fontSize: 12, cursor: 'pointer', outline: 'none'
                      }}
                    >
                      <option value="à faire">À Faire</option>
                      <option value="en cours">En Cours</option>
                      <option value="terminé">Terminé</option>
                    </select>
                  ) : (
                    <span className="badge" style={{ background: statusColors[m.statut], color: statusTextColors[m.statut] }}>
                      {m.statut}
                    </span>
                  )}
                  {canEdit && (
                    <button onClick={() => handleDeleteMilestone(m._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <input type="text" className="form-input" placeholder="Nouvelle étape..." value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddMilestone()} />
              <button className="btn btn-primary" onClick={handleAddMilestone}>
                <FiPlus /> Ajouter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Deliverables */}
      {activeTab === 'deliverables' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>Livrables</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setUploadModal(true)}>
              <FiUpload /> Upload
            </button>
          </div>
          {deliverables.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📂</div>
              <div className="empty-state-title">Aucun livrable</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th>Titre</th><th>Type</th><th>Version</th><th>Uploadé par</th><th>Date</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {deliverables.map(d => (
                    <tr key={d._id}>
                      <td><strong>{d.titre}</strong>{d.fichierNom && <div style={{ fontSize: 11, color: 'var(--gray)' }}>{d.fichierNom}</div>}</td>
                      <td><span className="badge badge-info">{d.type}</span></td>
                      <td>v{d.version}</td>
                      <td>{d.uploadePar?.prenom} {d.uploadePar?.nom}</td>
                      <td>{new Date(d.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a 
                            href={d.fichierURL?.startsWith('http') ? d.fichierURL : `http://localhost:5000${d.fichierURL}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            download={d.fichierNom}
                            className="btn btn-secondary btn-sm"
                            title="Télécharger"
                          >
                            <FiDownload size={13} />
                          </a>
                          {(canEdit || d.uploadePar?._id === user.id) && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDeliverable(d._id)}>
                              <FiTrash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Messages / Discussion */}
      {activeTab === 'messages' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
            {/* Messages list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 60 }}>
                  <FiMessageSquare size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <p style={{ fontSize: 15 }}>Pas encore de messages. Démarrez la discussion!</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const userId = user?._id?.toString() || user?.id?.toString();
                  const senderId = (msg.senderId?._id || msg.senderId)?.toString();
                  const isMe = senderId === userId;
                  const prevSenderId = (chatMessages[idx-1]?.senderId?._id || chatMessages[idx-1]?.senderId)?.toString();
                  const showAvatar = !isMe && (idx === 0 || prevSenderId !== senderId);
                  return (
                    <div key={msg._id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                      {!isMe && (
                        <div style={{ width: 32, flexShrink: 0 }}>
                          {showAvatar && (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #5b5fcf, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11 }}>
                              {`${msg.senderId?.prenom?.[0]||''}${msg.senderId?.nom?.[0]||''}`.toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ maxWidth: '65%' }}>
                        {!isMe && showAvatar && (
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3, paddingLeft: 2 }}>
                            {msg.senderId?.prenom} {msg.senderId?.nom}
                          </div>
                        )}
                        {isMe && showAvatar && (
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3, textAlign: 'right', paddingRight: 2 }}>
                            {msg.senderId?.prenom || 'Moi'} {msg.senderId?.nom || ''}
                          </div>
                        )}
                        <div style={{
                          background: isMe ? '#5b5fcf' : 'white', color: isMe ? 'white' : '#1a1d3b',
                          padding: '10px 14px',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          border: isMe ? 'none' : '1px solid #e4e6f1',
                        }}>
                          {msg.type === 'file' ? (
                            <a href={`http://localhost:5000${msg.filePath}`} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 10, color: isMe ? 'white' : '#5b5fcf', textDecoration: 'none' }}>
                              <FiFile size={20} />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{msg.fileName}</div>
                                {msg.content && <div style={{ fontSize: 12, opacity: 0.8 }}>{msg.content}</div>}
                              </div>
                              <FiDownload size={14} style={{ marginLeft: 'auto' }} />
                            </a>
                          ) : (
                            <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, textAlign: isMe ? 'right' : 'left', padding: isMe ? '0 2px 0 0' : '0 0 0 2px' }}>
                          {formatMsgTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>
            {/* Input */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e4e6f1', background: '#fafbff' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'white', borderRadius: 14, padding: '8px 12px', border: '1px solid #e4e6f1' }}>
                <textarea
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }}}
                  placeholder="Écrire un message..."
                  rows={1}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: '#1a1d3b', lineHeight: 1.5, maxHeight: 100, fontFamily: 'inherit', padding: '4px 0' }}
                  onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'; }}
                />
                <input type="file" ref={chatFileRef} style={{ display: 'none' }} onChange={handleChatFile} accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png" />
                <button onClick={() => chatFileRef.current?.click()} title="Envoyer un fichier"
                  style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                  {chatFileUploading ? <div style={{ width:16,height:16,border:'2px solid #e4e6f1',borderTopColor:'#5b5fcf',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/> : <FiPaperclip size={17} />}
                </button>
                <button onClick={handleChatSend} disabled={!chatText.trim() || chatSending}
                  style={{ background: chatText.trim() ? '#5b5fcf' : '#e4e6f1', color: chatText.trim() ? 'white' : '#9ca3af', border: 'none', borderRadius: 9, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: chatText.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                  {chatSending ? <div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/> : <FiSend size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation */}
      {activeTab === 'evaluation' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>Évaluation</h3>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setEvalModal(true)}>
                <FiEdit2 /> {evaluation ? 'Modifier' : 'Évaluer'}
              </button>
            )}
          </div>
          {!evaluation ? (
            <div className="empty-state">
              <div className="empty-state-icon">⭐</div>
              <div className="empty-state-title">Pas encore évalué</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { label: 'Note Encadrant (40%)', value: evaluation.noteEncadrant, comment: evaluation.commentaireEncadrant, color: '#4f46e5' },
                { label: 'Note Jury (60%)', value: evaluation.noteJury, comment: evaluation.commentaireJury, color: '#0ea5e9' },
              ].map((item, i) => (
                <div key={i} style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 600, marginBottom: 8 }}>{item.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: item.color, marginBottom: 8 }}>
                    {item.value != null ? `${item.value}/20` : '—'}
                  </div>
                  {item.comment && <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.5 }}>{item.comment}</div>}
                </div>
              ))}
              {evaluation.noteFinale != null && (
                <div style={{ gridColumn: '1/-1', padding: 24, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 12, textAlign: 'center', color: 'white' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>Note Finale</div>
                  <div style={{ fontSize: 48, fontWeight: 900 }}>{evaluation.noteFinale}<span style={{ fontSize: 24 }}>/20</span></div>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                    {evaluation.noteFinale >= 16 ? '🏆 Excellent' : evaluation.noteFinale >= 12 ? '✅ Bien' : evaluation.noteFinale >= 10 ? '⚠️ Passable' : '❌ Insuffisant'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="modal-overlay" onClick={() => setUploadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Uploader un livrable</h3>
              <button onClick={() => setUploadModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Fichier *</label>
                <input type="file" accept=".pdf,.zip,.doc,.docx,.ppt,.pptx"
                  onChange={e => setUploadFile(e.target.files[0])}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 8 }} />
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>PDF, ZIP, DOC, DOCX, PPT (max 20MB)</div>
              </div>
              <div className="form-group">
                <label className="form-label">Titre *</label>
                <input type="text" className="form-input" value={uploadForm.titre}
                  onChange={e => setUploadForm({ ...uploadForm, titre: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={uploadForm.type}
                    onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}>
                    <option value="rapport">Rapport</option>
                    <option value="code">Code</option>
                    <option value="présentation">Présentation</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Version</label>
                  <input type="text" className="form-input" value={uploadForm.version}
                    onChange={e => setUploadForm({ ...uploadForm, version: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Commentaire</label>
                <textarea className="form-textarea" rows={3} value={uploadForm.commentaire}
                  onChange={e => setUploadForm({ ...uploadForm, commentaire: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setUploadModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? <><span className="btn-spinner"></span>Upload...</> : <><FiUpload /> Uploader</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {evalModal && canEdit && (
        <div className="modal-overlay" onClick={() => setEvalModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Évaluer le projet</h3>
              <button onClick={() => setEvalModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#065f46' }}>
                💡 Formule: Note finale = (Note Encadrant × 40%) + (Note Jury × 60%)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Note Encadrant /20</label>
                  <input type="number" className="form-input" min="0" max="20" step="0.5"
                    value={evalForm.noteEncadrant} onChange={e => setEvalForm({ ...evalForm, noteEncadrant: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Note Jury /20</label>
                  <input type="number" className="form-input" min="0" max="20" step="0.5"
                    value={evalForm.noteJury} onChange={e => setEvalForm({ ...evalForm, noteJury: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Commentaire Encadrant</label>
                <textarea className="form-textarea" rows={3} value={evalForm.commentaireEncadrant}
                  onChange={e => setEvalForm({ ...evalForm, commentaireEncadrant: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Commentaire Jury</label>
                <textarea className="form-textarea" rows={3} value={evalForm.commentaireJury}
                  onChange={e => setEvalForm({ ...evalForm, commentaireJury: e.target.value })} />
              </div>
              {evalForm.noteEncadrant && evalForm.noteJury && (
                <div style={{ padding: 16, background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: 10, color: 'white', textAlign: 'center' }}>
                  Note finale estimée: <strong>{((parseFloat(evalForm.noteEncadrant) * 0.4) + (parseFloat(evalForm.noteJury) * 0.6)).toFixed(2)}/20</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEvalModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveEval}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}