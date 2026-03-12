import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { login as loginApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', motDePasse: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginApi(form);
      login(res.data.token, res.data.user);
      toast.success(`Bienvenue, ${res.data.user.prenom}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-form-side">
          <div className="auth-form-container">

            {/* Avatar */}
            <div className="auth-avatar">
              <FiUser />
            </div>

            <div className="auth-header">
              <h2>Connexion</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <div className="input-wrapper">
                  <FiUser className="input-icon" />
                  <input
                    type="email"
                    className="form-input with-icon"
                    placeholder="Email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="form-input with-icon"
                    placeholder="••••••••••••"
                    value={form.motDePasse}
                    onChange={e => setForm({ ...form, motDePasse: e.target.value })}
                    required
                  />
                  <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="auth-forgot">
                <Link to="/forgot-password">Forgot Password?</Link>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <><span className="btn-spinner"></span>Connexion...</> : 'Login'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Pas encore de compte? <Link to="/register">S'inscrire</Link></p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}