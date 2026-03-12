import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiBookOpen, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { register as registerApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', motDePasse: '', departement: '', role: 'ROLE_STUDENT' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerApi(form);
      login(res.data.token, res.data.user);
      toast.success('Compte créé avec succès!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
        </div>
        <div className="auth-brand">
          <div className="auth-logo"><FiBookOpen /></div>
          <h1>PFE Management</h1>
          <p>Rejoignez la plateforme de gestion des projets de fin d'études</p>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2>Créer un compte</h2>
            <p>Remplissez le formulaire pour commencer</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <div className="input-wrapper">
                  <FiUser className="input-icon" />
                  <input type="text" className="form-input with-icon" placeholder="Prénom" value={form.prenom}
                    onChange={e => setForm({ ...form, prenom: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input type="text" className="form-input" placeholder="Nom" value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <FiMail className="input-icon" />
                <input type="email" className="form-input with-icon" placeholder="votre@email.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Département</label>
              <div className="input-wrapper">
                <FiBriefcase className="input-icon" />
                <input type="text" className="form-input with-icon" placeholder="ex: Informatique" value={form.departement}
                  onChange={e => setForm({ ...form, departement: e.target.value })} />
              </div>
            </div>

            <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '12px 16px', marginBottom: 8, fontSize: 13, color: '#3730a3', lineHeight: 1.6 }}>
              <strong>Vous vous inscrivez en tant qu'Étudiant.</strong><br />
              Si vous êtes encadrant, contactez l'administrateur pour que votre compte soit activé avec le bon rôle.
            </div>

            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input type={showPwd ? 'text' : 'password'} className="form-input with-icon" placeholder="Min. 6 caractères"
                  value={form.motDePasse} onChange={e => setForm({ ...form, motDePasse: e.target.value })} required minLength={6} />
                <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <><span className="btn-spinner"></span>Création...</> : 'Créer mon compte'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Déjà un compte? <Link to="/login">Se connecter</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}