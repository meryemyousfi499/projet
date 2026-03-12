import React, { useState } from 'react';
import { FiUser, FiMail, FiBriefcase, FiLock, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { updateProfile, changePassword } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const roleBadge = { ROLE_ADMIN: { label: 'Administrateur', color: '#f59e0b', bg: '#fef3c7' }, ROLE_SUPERVISOR: { label: 'Encadrant', color: '#0ea5e9', bg: '#dbeafe' }, ROLE_STUDENT: { label: 'Étudiant', color: '#10b981', bg: '#d1fae5' } };

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ nom: user.nom, prenom: user.prenom, departement: user.departement || '' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(profileForm);
      updateUser({ ...user, ...res.data.data });
      toast.success('Profil mis à jour!');
    } catch { toast.error('Erreur'); } finally { setSaving(false); }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setSavingPwd(true);
    try {
      await changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      toast.success('Mot de passe modifié!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); } finally { setSavingPwd(false); }
  };

  const badge = roleBadge[user.role];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"> Mon Profil</h1>
          <p className="page-subtitle">Gérez vos informations personnelles</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Profile card */}
        <div>
          <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
            <div className="avatar" style={{ width: 80, height: 80, fontSize: 28, margin: '0 auto 16px', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)' }}>
              {`${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase()}
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{user.prenom} {user.nom}</h3>
            <div style={{ marginBottom: 8 }}>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: badge?.bg, color: badge?.color }}>
                {badge?.label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 4 }}>{user.email}</div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>{user.departement || 'N/A'}</div>
          </div>

          <div className="card">
            <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Informations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: FiUser, label: 'Nom complet', value: `${user.prenom} ${user.nom}` },
                { icon: FiMail, label: 'Email', value: user.email },
                { icon: FiBriefcase, label: 'Département', value: user.departement || 'N/A' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <item.icon size={14} color="var(--gray)" />
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* Edit Profile */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Modifier le profil</h3>
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Prénom</label>
                  <input type="text" className="form-input" value={profileForm.prenom}
                    onChange={e => setProfileForm({ ...profileForm, prenom: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input type="text" className="form-input" value={profileForm.nom}
                    onChange={e => setProfileForm({ ...profileForm, nom: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Département</label>
                <input type="text" className="form-input" value={profileForm.departement}
                  onChange={e => setProfileForm({ ...profileForm, departement: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="btn-spinner"></span>Sauvegarde...</> : <><FiSave /> Sauvegarder</>}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Changer le mot de passe</h3>
            <form onSubmit={handleChangePwd}>
              <div className="form-group">
                <label className="form-label">Mot de passe actuel</label>
                <input type="password" className="form-input" value={pwdForm.currentPassword}
                  onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe</label>
                  <input type="password" className="form-input" value={pwdForm.newPassword}
                    onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmer</label>
                  <input type="password" className="form-input" value={pwdForm.confirmPassword}
                    onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingPwd}>
                {savingPwd ? <><span className="btn-spinner"></span>Modification...</> : <><FiLock /> Modifier</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
