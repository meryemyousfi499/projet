import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../services/api';
import AuthLayout from './AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
      toast.success('Instructions envoyées!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {!sent ? (
        <>
          <div className="auth-header">
            <h2>Mot de passe oublié?</h2>
            <p>Entrez votre email pour recevoir les instructions</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <FiMail className="input-icon" />
                <input type="email" className="form-input with-icon" placeholder="votre@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <><span className="btn-spinner"></span>Envoi...</> : 'Envoyer les instructions'}
            </button>
          </form>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
          <h2 style={{ marginBottom: 12 }}>Email envoyé!</h2>
          <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
            Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.
          </p>
        </div>
      )}
      <div className="auth-footer" style={{ marginTop: 20 }}>
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: 'var(--primary)' }}>
          <FiArrowLeft /> Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  );
}