import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginToBackend } from '../../services/api';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import './login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    isExpired ? 'Your session has expired. Please sign in again.' : null
  );

  // Email + Password submit
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await loginToBackend(email, password);
    setIsLoading(false);

    if (result.status === 'success' && result.data) {
      login(result.data.token, result.data.user);
      navigate('/firoz-84');
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow-bg" />
      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-logo">
              <img src="/favicon.png" alt="GS" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
            </div>
            <h1 className="login-title">Gazi Sports 24</h1>
            <p className="login-subtitle">Control Center Portal</p>
          </div>

          {/* ── ERROR MESSAGE ── */}
          {error && (
            <div className="login-error-alert">
              <AlertCircle size={16} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* ── EMAIL + PASSWORD FORM ── */}
          <form onSubmit={handleCredentialsSubmit} className="login-form">
            <div className="login-input-group">
              <label className="login-label">Email Address</label>
              <div className="login-input-wrapper">
                <Mail size={16} className="login-input-icon" />
                <input
                  type="email"
                  className="login-input"
                  placeholder="admin@gazisports24.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="login-input-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label className="login-label">Password</label>
              <div className="login-input-wrapper">
                <Lock size={16} className="login-input-icon" />
                <input
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Sign In →</span>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>© 2026 Gazi Sports 24. All rights reserved.</p>
            <p style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
              Authorized Administrative Staff Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
