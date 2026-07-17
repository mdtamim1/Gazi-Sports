import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { verifyInvitationToken, googleRegisterEmployee } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

declare global {
  interface Window { google?: any; }
}

export default function RegisterEmployee() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [invitedRole, setInvitedRole] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Step 1: Verify invitation token
  useEffect(() => {
    if (!token) {
      setVerifyError('ইনভাইটেশন টোকেন পাওয়া যায়নি। দয়া করে সঠিক লিংক ব্যবহার করুন।');
      setLoading(false);
      return;
    }

    const checkToken = async () => {
      const res = await verifyInvitationToken(token);
      if (res.status === 'success') {
        setInvitedEmail(res.data.email);
        setInvitedRole(res.data.role);
      } else {
        setVerifyError(res.message || 'ইনভাইটেশন টোকেনটি সঠিক নয় অথবা ইতিমধ্যে ব্যবহৃত হয়েছে।');
      }
      setLoading(false);
    };

    checkToken();
  }, [token]);

  // Step 2: Load Google Sign-In after token verified
  useEffect(() => {
    if (!invitedEmail || loading) return;

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
  }, [invitedEmail, loading]);

  // Google OAuth callback → register + login
  const handleGoogleResponse = async (response: any) => {
    setGoogleLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    const res = await googleRegisterEmployee(token, response.credential);
    setGoogleLoading(false);

    if (res.status === 'success' && res.data) {
      setSubmitSuccess('রেজিস্ট্রেশন সফল! Admin panel-এ প্রবেশ করা হচ্ছে...');
      // Auto-login: save token and redirect
      login(res.data.token, res.data.user);
      setTimeout(() => navigate('/admin'), 2000);
    } else {
      setSubmitError(res.message || 'Google দিয়ে verification সফল হয়নি।');
    }
  };

  // ── LOADING ──
  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0a0e1a', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'rotate 1s linear infinite', margin: '0 auto 16px' }} />
          <p>ইনভাইটেশন লিংক যাচাই করা হচ্ছে...</p>
        </div>
        <style>{`@keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── INVALID TOKEN ──
  if (verifyError) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '440px', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={28} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, marginBottom: '12px' }}>ভুল বা মেয়াদোত্তীর্ণ লিংক</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>{verifyError}</p>
          <button onClick={() => navigate('/login')} style={{ height: '42px', width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            লগইন পেজে যান
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN FORM ──
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '460px', background: 'rgba(17,24,50,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldCheck size={30} color="#10b981" />
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0' }}>আমন্ত্রণপত্র গ্রহণ করুন</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
            আপনি এই পোর্টালে <strong style={{ color: '#fff' }}>{invitedRole}</strong> হিসেবে আমন্ত্রিত হয়েছেন
          </p>
        </div>

        {/* Invited Email Display */}
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mail size={18} color="#6366f1" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>আমন্ত্রিত Gmail</div>
            <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginTop: '2px' }}>{invitedEmail}</div>
          </div>
        </div>

        {/* Warning */}
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', padding: '12px 14px', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '12px', color: '#fbbf24' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            <strong>গুরুত্বপূর্ণ:</strong> শুধুমাত্র <strong>{invitedEmail}</strong> দিয়ে Google sign-in করুন। অন্য Gmail দিয়ে accept করা যাবে না।
          </span>
        </div>

        {/* Error / Success */}
        {submitError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {submitError}
          </div>
        )}
        {submitSuccess && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> {submitSuccess}
          </div>
        )}

        {/* Google Sign-In Button */}
        {!submitSuccess && (
          googleLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8', padding: '16px 0' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'rotate 1s linear infinite' }} />
              <span style={{ fontSize: '14px' }}>Google verification হচ্ছে...</span>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginBottom: '12px', margin: '0 0 12px 0' }}>
                নিচের বাটনে ক্লিক করে Google account দিয়ে invitation accept করুন
              </p>
              <div ref={googleBtnRef} id="google-invite-btn" style={{ display: 'flex', justifyContent: 'center' }} />
            </div>
          )
        )}

        {!submitSuccess && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowRight size={12} style={{ transform: 'rotate(180deg)' }} />
              লগইন পেজে ফিরে যান
            </button>
          </div>
        )}

        <style>{`@keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
