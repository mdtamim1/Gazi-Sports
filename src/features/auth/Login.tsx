import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginToBackend, verifyGoogleStep } from '../../services/api';
import { Mail, Lock, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import './login.css';

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';

  // Step 1 state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    isExpired ? 'Your session has expired. Please sign in again.' : null
  );

  // Step 2 state
  const [step, setStep] = useState<'credentials' | 'google'>('credentials');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Load Google Identity Services script
  useEffect(() => {
    if (step !== 'google') return;

    const loadGsi = () => {
      if (window.google?.accounts?.id) {
        initGoogle();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    };

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
        ux_mode: 'popup',
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
    };

    loadGsi();
  }, [step]);

  // Step 1: Email + Password submit
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

    if (result.step === 'google_verify_required') {
      setPreAuthToken(result.preAuthToken);
      setStep('google');
      setError(null);
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  // Step 2: Google OAuth callback
  const handleGoogleResponse = async (response: any) => {
    setGoogleLoading(true);
    setError(null);

    const result = await verifyGoogleStep(preAuthToken, response.credential);
    setGoogleLoading(false);

    if (result.status === 'success' && result.data) {
      login(result.data.token, result.data.user);
      navigate('/admin');
    } else {
      setError(result.message || 'Google verification failed.');
    }
  };

  const handleBackToStep1 = () => {
    setStep('credentials');
    setError(null);
    setPreAuthToken('');
    setPassword('');
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

          {/* ── STEP INDICATOR ── */}
          <div className="login-steps">
            <div className={`login-step ${step === 'credentials' ? 'active' : 'done'}`}>
              <div className="login-step-dot">{step === 'google' ? '✓' : '1'}</div>
              <span>Credentials</span>
            </div>
            <div className="login-step-line" />
            <div className={`login-step ${step === 'google' ? 'active' : ''}`}>
              <div className="login-step-dot">2</div>
              <span>Google Verify</span>
            </div>
          </div>

          {/* ── ERROR MESSAGE ── */}
          {error && (
            <div className="login-error-alert">
              <AlertCircle size={16} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════ STEP 1: EMAIL + PASSWORD ══════════ */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="login-form">
              <div className="login-input-group">
                <label className="login-label">Email Address</label>
                <div className="login-input-wrapper">
                  <Mail size={16} className="login-input-icon" />
                  <input
                    type="email"
                    className="login-input"
                    placeholder="gazisports24@gmail.com"
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
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Continue →</span>
                )}
              </button>
            </form>
          )}

          {/* ══════════ STEP 2: GOOGLE VERIFICATION ══════════ */}
          {step === 'google' && (
            <div className="login-google-step">
              <div className="login-google-icon-wrap">
                <ShieldCheck size={32} className="login-shield-icon" />
              </div>
              <h2 className="login-google-title">Google Verification</h2>
              <p className="login-google-desc">
                Credentials verified ✓<br />
                Now sign in with your <strong>authorized Google account</strong> to complete login.
              </p>

              <div className="login-google-warning">
                <AlertCircle size={14} />
                <span>Only the authorized Gmail can proceed. Other accounts will be rejected.</span>
              </div>

              {googleLoading ? (
                <div className="login-google-loading">
                  <Loader2 size={20} className="spinner" />
                  <span>Verifying Google account...</span>
                </div>
              ) : (
                <div className="login-google-btn-wrap">
                  <div ref={googleBtnRef} id="google-signin-btn" />
                </div>
              )}

              <button
                type="button"
                className="login-back-btn"
                onClick={handleBackToStep1}
                disabled={googleLoading}
              >
                <ArrowLeft size={14} />
                Back to credentials
              </button>
            </div>
          )}

          <div className="login-footer">
            <p>
              © 2026 Gazi Sports. All rights reserved. | Designed &amp; developed by{' '}
              <a
                href="https://tamim-lab.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#818cf8', textDecoration: 'underline' }}
              >
                Tamim Labs
              </a>
            </p>
            <p style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
              Authorized Administrative Staff Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
