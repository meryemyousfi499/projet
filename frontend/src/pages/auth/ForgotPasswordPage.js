import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../services/api';
import AuthLayout from './AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // FIX 1 — normaliser l'email avant envoi (trim + lowercase)
      await forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
      toast.success('Instructions envoyées !');
    } catch (err) {
      // FIX 2 — couvrir les erreurs réseau (err.response undefined)
      //          et les erreurs HTTP (err.response.data.message)
      const msg =
        err.response?.data?.message ??
        'Impossible de contacter le serveur. Vérifiez votre connexion.';
      toast.error(msg);
    } finally {
      // FIX 3 — setLoading(false) garanti dans tous les cas
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {!sent ? (
        <>
          <div className="auth-header">
            <h2>Mot de passe oublié ?</h2>
            <p>Entrez votre email pour recevoir les instructions</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  className="form-input with-icon"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  Envoi en cours...
                </>
              ) : (
                'Envoyer les instructions'
              )}
            </button>
          </form>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
          <h2 style={{ marginBottom: 12 }}>Email envoyé !</h2>
          <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
            Si cet email est enregistré, vous recevrez un lien de
            réinitialisation dans quelques instants.
          </p>
          {/* FIX 4 — bouton pour renvoyer sans recharger la page */}
          <button
            className="btn btn-secondary"
            onClick={() => { setSent(false); setEmail(''); }}
            style={{ marginBottom: 8 }}
          >
            Essayer un autre email
          </button>
        </div>
      )}

      <div className="auth-footer" style={{ marginTop: 20 }}>
        <Link
          to="/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
            color: 'var(--primary)',
          }}
        >
          <FiArrowLeft /> Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  );
}