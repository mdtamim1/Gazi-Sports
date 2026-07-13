import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UserPlus, Lock, ShieldCheck, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { verifyInvitationToken, registerEmployee } from '../../services/api';

export default function RegisterEmployee() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [invitedRole, setInvitedRole] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setVerifyError('ইনভাইটেশন টোকেন পাওয়া যায়নি। দয়া করে সঠিক লিংক ব্যবহার করুন।');
      setLoading(false);
      return;
    }

    const checkToken = async () => {
      const res = await verifyInvitationToken(token);
      if (res.status === 'success') {
        setInvitedEmail(res.data.email);
        setInvitedRole(res.data.role);
      } else {
        setVerifyError(res.message || 'ইনভাইটেশন টোকেনটি সঠিক নয় অথবা ইতিমধ্যে ব্যবহৃত হয়েছে।');
      }
      setLoading(false);
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!name.trim()) {
      setSubmitError('আপনার সম্পূর্ণ নাম লিখুন।');
      return;
    }
    if (password.length < 6) {
      setSubmitError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('পাসওয়ার্ড দুটি মেলেনি। আবার চেষ্টা করুন।');
      return;
    }

    setSubmitting(true);
    const res = await registerEmployee({
      token,
      name: name.trim(),
      password
    });

    if (res.status === 'success') {
      setSubmitSuccess('রেজিস্ট্রেশন সফল হয়েছে! আপনাকে লগইন পেজে রিডাইরেক্ট করা হচ্ছে...');
      setTimeout(() => {
        navigate('/login', { state: { message: 'রেজিস্ট্রেশন সফল হয়েছে! আপনার নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' } });
      }, 3000);
    } else {
      setSubmitError(res.message || 'রেজিস্ট্রেশন সম্পন্ন করতে সমস্যা হয়েছে।');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0a0e1a', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255, 255, 255, 0.1)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'rotate 1s linear infinite', margin: '0 auto 16px' }} />
          <p>ইনভাইটেশন লিংক ভেরিফাই করা হচ্ছে...</p>
        </div>
        <style>{`@keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '36px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
        
        {verifyError ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertCircle size={28} />
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>ভুল বা এক্সপায়ার্ড লিংক</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>{verifyError}</p>
            <button onClick={() => navigate('/login')} style={{ height: '42px', width: '100%', background: '#ffffff', color: '#090d16', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>লগইন পেজে যান</button>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UserPlus size={26} />
              </div>
              <h2 style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0' }}>আমন্ত্রণপত্র গ্রহণ করুন</h2>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
                আপনি এই পোর্টালে <strong style={{ color: '#ffffff' }}>{invitedRole}</strong> হিসেবে আমন্ত্রিত হয়েছেন
              </p>
            </div>

            {submitError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {submitError}
              </div>
            )}

            {submitSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {submitSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '6px' }}>ইমেইল ঠিকানা</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#4b5563' }} />
                  <input
                    type="email"
                    disabled
                    value={invitedEmail}
                    style={{ width: '100%', height: '42px', border: '1px solid #374151', borderRadius: '8px', padding: '0 12px 0 38px', outline: 'none', background: '#1f2937', color: '#9ca3af', cursor: 'not-allowed', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '6px' }}>আপনার সম্পূর্ণ নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মো: আরিফুল ইসলাম"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', height: '42px', border: '1px solid #374151', borderRadius: '8px', padding: '0 12px', outline: 'none', background: '#1f2937', color: '#ffffff', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '6px' }}>পাসওয়ার্ড তৈরি করুন *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#4b5563' }} />
                  <input
                    type="password"
                    required
                    placeholder="পাসওয়ার্ড দিন"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', height: '42px', border: '1px solid #374151', borderRadius: '8px', padding: '0 12px 0 38px', outline: 'none', background: '#1f2937', color: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '6px' }}>পাসওয়ার্ড নিশ্চিত করুন *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#4b5563' }} />
                  <input
                    type="password"
                    required
                    placeholder="পাসওয়ার্ড আবার দিন"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', height: '42px', border: '1px solid #374151', borderRadius: '8px', padding: '0 12px 0 38px', outline: 'none', background: '#1f2937', color: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', height: '44px', background: '#ffffff', color: '#090d16', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px', transition: 'background 0.2s' }}
              >
                {submitting ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন সম্পন্ন করুন'} <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
