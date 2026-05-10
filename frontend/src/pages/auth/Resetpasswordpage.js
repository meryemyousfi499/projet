import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiLock, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';

export default function ResetPasswordPage() {
  const { token }                       = useParams();
  const navigate                        = useNavigate();
  const [motDePasse, setMotDePasse]     = useState('');
  const [confirm, setConfirm]           = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [done, setDone]                 = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (motDePasse.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (motDePasse !== confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/auth/reset-password/${token}`,
        {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ motDePasse }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors de la réinitialisation');
      }

      setDone(true);
      toast.success('Mot de passe réinitialisé avec succès !');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.message ?? 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {!done ? (
        <>
          <div className="auth-header">
            <h2>Nouveau mot de passe</h2>
            <p>Choisissez un nouveau mot de passe sécurisé</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Nouveau mot de passe */}
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input with-icon"
                  placeholder="Minimum 6 caractères"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                  disabled={loading}
                />
                <span
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%',
                           transform: 'translateY(-50%)', cursor: 'pointer',
                           color: 'var(--gray)' }}
                >
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
            </div>

            {/* Confirmation */}
            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input with-icon"
                  placeholder="Répétez le mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Réinitialisation...
                </>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </button>
          </form>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
          <h2 style={{ marginBottom: 12 }}>Mot de passe modifié !</h2>
          <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
            Vous allez être redirigé vers la page de connexion dans 3 secondes...
          </p>
          <Link to="/login" className="btn btn-primary">
            Se connecter maintenant
          </Link>
        </div>
      )}

      <div className="auth-footer" style={{ marginTop: 20 }}>
        <Link
          to="/login"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            justifyContent: 'center', color: 'var(--primary)',
          }}
        >
          <FiArrowLeft /> Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  );
}