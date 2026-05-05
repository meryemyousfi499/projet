// src/pages/auth/AuthLayout.js
import React from 'react';
import { FiBookOpen } from 'react-icons/fi';
import './AuthPages.css';

export default function AuthLayout({ children }) {
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
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-container">
          {children}
          <div className="auth-header">
            <h2>Créer un compte</h2>
            <p>Remplissez le formulaire pour commencer</p>
          </div>
        </div>
      </div>
    </div>
  );
}