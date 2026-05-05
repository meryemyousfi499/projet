import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus } from '../../services/api';

const roles = [
  { value: '', label: 'Tous les rôles' },
  { value: 'ROLE_STUDENT', label: 'Étudiant' },
  { value: 'ROLE_SUPERVISOR', label: 'Encadrant' },
  { value: 'ROLE_ADMIN', label: 'Admin' },
];

const roleLabels = { ROLE_STUDENT: { label: 'Étudiant', class: 'badge-success' }, ROLE_SUPERVISOR: { label: 'Encadrant', class: 'badge-info' }, ROLE_ADMIN: { label: 'Admin', class: 'badge-warning' } };

const emptyForm = { nom: '', prenom: '', email: '', motDePasse: '', role: 'ROLE_STUDENT', departement: '', statut: 'actif' };

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => { fetchUsers(); }, [search, roleFilter, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({ search, role: roleFilter, page, limit });
      setUsers(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  const openCreate = () => { setEditUser(null); setForm(emptyForm); setModal(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ ...u, motDePasse: '' }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        const { motDePasse, ...data } = form;
        await updateUser(editUser._id, data);
        toast.success('Utilisateur modifié!');
      } else {
        await createUser(form);
        toast.success('Utilisateur créé!');
      }
      setModal(false);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur?')) return;
    try { await deleteUser(id); toast.success('Supprimé'); fetchUsers(); } catch { toast.error('Erreur'); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleUserStatus(id);
      toast.success(`Statut changé: ${res.data.data.statut}`);
      fetchUsers();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"> Gestion Utilisateurs</h1>
          <p className="page-subtitle">{total} utilisateur(s) au total</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><FiPlus /> Nouvel utilisateur</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input type="text" className="search-input" placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select" style={{ width: 200 }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Département</th><th>Statut</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>Aucun utilisateur</td></tr>
                ) : users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{`${u.prenom?.[0] || ''}${u.nom?.[0] || ''}`.toUpperCase()}</div>
                        <div><div style={{ fontWeight: 600, fontSize: 14 }}>{u.prenom} {u.nom}</div></div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray)' }}>{u.email}</td>
                    <td><span className={`badge ${roleLabels[u.role]?.class}`}>{roleLabels[u.role]?.label}</span></td>
                    <td style={{ fontSize: 13 }}>{u.departement || '—'}</td>
                    <td>
                      <span className={`badge ${u.statut === 'actif' ? 'badge-success' : 'badge-danger'}`}>{u.statut}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} title="Modifier"><FiEdit2 size={13} /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(u._id)} title="Activer/Désactiver">
                          {u.statut === 'actif' ? <FiToggleRight size={15} color="#10b981" /> : <FiToggleLeft size={15} color="#94a3b8" />}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)} title="Supprimer"><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {Array.from({ length: Math.ceil(total / limit) }, (_, i) => (
              <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editUser ? 'Modifier' : 'Créer'} un utilisateur</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Prénom *</label>
                    <input type="text" className="form-input" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input type="text" className="form-input" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                {!editUser && (
                  <div className="form-group">
                    <label className="form-label">Mot de passe *</label>
                    <input type="password" className="form-input" value={form.motDePasse} onChange={e => setForm({ ...form, motDePasse: e.target.value })} required={!editUser} minLength={6} />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Rôle</label>
                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                      <option value="ROLE_STUDENT">Étudiant</option>
                      <option value="ROLE_SUPERVISOR">Encadrant</option>
                      <option value="ROLE_ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Département</label>
                    <input type="text" className="form-input" value={form.departement} onChange={e => setForm({ ...form, departement: e.target.value })} />
                  </div>
                </div>
                {editUser && (
                  <div className="form-group">
                    <label className="form-label">Statut</label>
                    <select className="form-select" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="btn-spinner"></span>Sauvegarde...</> : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
