import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getMySubjects, createSubject, updateSubject, deleteSubject } from '../../services/api';

const emptyForm = { titre: '', description: '', technologies: '', nombreMaxEtudiants: 1 };

export default function MySupervisorSubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSubjects(); }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await getMySubjects();
      setSubjects(res.data.data);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const openCreate = () => { setEditSubject(null); setForm(emptyForm); setModal(true); };
  const openEdit = (s) => {
    setEditSubject(s);
    setForm({ ...s, technologies: s.technologies?.join(', ') || '' });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      technologies: form.technologies.split(',').map(t => t.trim()).filter(Boolean)
    };
    try {
      if (editSubject) { await updateSubject(editSubject._id, data); toast.success('Sujet modifié!'); }
      else { await createSubject(data); toast.success('Sujet proposé! En attente de validation.'); }
      setModal(false);
      fetchSubjects();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce sujet?')) return;
    try { await deleteSubject(id); toast.success('Supprimé'); fetchSubjects(); } catch { toast.error('Erreur'); }
  };

  const statusColor = { proposé: { bg: '#fef3c7', color: '#92400e' }, validé: { bg: '#d1fae5', color: '#065f46' }, refusé: { bg: '#fee2e2', color: '#991b1b' }, complet: { bg: '#f1f5f9', color: '#475569' } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes Sujets</h1>
          <p className="page-subtitle">{subjects.length} sujet(s)</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><FiPlus /> Proposer un sujet</button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">Aucun sujet proposé</div>
          <div style={{ marginTop: 16 }}><button className="btn btn-primary" onClick={openCreate}><FiPlus /> Proposer un sujet</button></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {subjects.map(s => (
            <div key={s._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="badge" style={{ background: statusColor[s.statut]?.bg, color: statusColor[s.statut]?.color }}>
                  {s.statut}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}><FiEdit2 size={13} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}><FiTrash2 size={13} /></button>
                </div>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.titre}</h3>
              <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 12 }}>
                {s.description.length > 120 ? s.description.slice(0, 120) + '...' : s.description}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {s.technologies?.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                Max {s.nombreMaxEtudiants} étudiant(s) · {s.nombreCandidatures || 0} candidature(s)
              </div>
              {s.commentaireAdmin && (
                <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
                  💬 Admin: {s.commentaireAdmin}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editSubject ? 'Modifier' : 'Proposer'} un sujet</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Titre *</label>
                  <input type="text" className="form-input" value={form.titre}
                    onChange={e => setForm({ ...form, titre: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea className="form-textarea" rows={4} value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Technologies (séparées par des virgules)</label>
                  <input type="text" className="form-input" placeholder="React, Node.js, MongoDB..."
                    value={form.technologies} onChange={e => setForm({ ...form, technologies: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre max d'étudiants</label>
                  <input type="number" className="form-input" min={1} max={5} value={form.nombreMaxEtudiants}
                    onChange={e => setForm({ ...form, nombreMaxEtudiants: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="btn-spinner"></span>Envoi...</> : 'Soumettre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
