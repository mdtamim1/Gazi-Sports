import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Flame, Gift, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export const CustomerEventsTab: React.FC = () => {
  const { customer } = useCustomerAuth();
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claimedInfo, setClaimedInfo] = useState<any | null>(null);

  useEffect(() => {
    // Check local storage for claimed status
    const globalClaimed = localStorage.getItem('spin_wheel_claimed');
    const userClaimed = customer?.email ? localStorage.getItem(`spin_wheel_claimed_${customer.email.trim().toLowerCase()}`) : null;

    const activeClaim = userClaimed || globalClaimed;
    if (activeClaim) {
      try {
        const parsed = JSON.parse(activeClaim);
        setHasClaimed(true);
        setClaimedInfo(parsed);
      } catch (e) {
        setHasClaimed(true);
      }
    }
  }, [customer]);

  const handleOpenWheel = () => {
    window.dispatchEvent(new Event('open-spin-wheel'));
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={24} style={{ color: '#fbbf24' }} />
          <span>বিশেষ ইভেন্ট ও অফারসমূহ (Events & Campaigns)</span>
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          আপনার অ্যাকাউন্টের বিশেষ ইভেন্ট ও অফারে অংশগ্রহণ করুন এবং বিশেষ ডিসকাউন্ট পুরস্কার জিতুন! (প্রতি আইডিতে ১ বার স্পিন সুযোগ)
        </p>
      </div>

      {/* Events Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Event 1: Spin & Win Wheel */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(23, 20, 52, 0.95), rgba(15, 12, 35, 0.98))',
            border: `1.5px solid ${hasClaimed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(251, 191, 36, 0.5)'}`,
            borderRadius: '20px',
            padding: '24px',
            boxShadow: hasClaimed ? 'none' : '0 12px 30px -10px rgba(251, 191, 36, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Top Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} />
              <span>চলতি ইভেন্ট (Live)</span>
            </span>
            <span style={{ background: hasClaimed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: hasClaimed ? '#10b981' : '#f59e0b', border: `1px solid ${hasClaimed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`, padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
              {hasClaimed ? '১/১ সুযোগ ব্যবহৃত' : '১টি সুযোগ বাকি (1 Spin Left)'}
            </span>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={20} style={{ color: '#f59e0b' }} />
              <span>স্পিন & উইন লটারি চাকা</span>
            </h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {hasClaimed ? (
                <>আপনি এই অ্যাকাউন্ট দিয়ে ইতিপূর্বে স্পিন সম্পন্ন করেছেন। আপনার কুপনটি দেখতে <strong>'আমার কুপন'</strong> সেকশন চেক করুন।</>
              ) : (
                <>চাকা ঘুরিয়ে পেয়ে যান ২০% পর্যন্ত স্পেশাল ডিসকাউন্ট কুপন ও প্রমো কোড পুরস্কার! (প্রতি আইডিতে ১ বার)</>
              )}
            </p>
          </div>

          {hasClaimed ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontWeight: 700, fontSize: '0.88rem' }}>
              <CheckCircle2 size={20} />
              <span>ইতিমধ্যে আপনার ১টি সুযোগ ব্যবহার করেছেন!</span>
            </div>
          ) : (
            <button
              onClick={handleOpenWheel}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 18px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)',
                transition: 'transform 0.2s, boxShadow 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Trophy size={18} />
              <span>স্পিন হুইল খেলুন & পুরস্কার জিতুন</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Event 2: Festival Gift Offer */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(23, 20, 52, 0.8), rgba(13, 10, 31, 0.9))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gift size={14} />
              <span>উপহার বোনাস</span>
            </span>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} style={{ color: '#a78bfa' }} />
              <span>স্পেশাল অ্যাকাউন্ট গিফট</span>
            </h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5 }}>
              নতুন অ্যাকাউন্ট নিবন্ধনে আপনার জন্য জমা হওয়া বিশেষ সারপ্রাইজ উপহার দেখতে 'আমার কুপন' ট্যাবে ক্লিক করুন।
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '10px 14px', fontSize: '0.8rem', color: '#a78bfa', fontWeight: 700, textAlign: 'center' }}>
            🎁 বোনাস আপনার কুপন ওয়ালেটে স্বয়ংক্রিয়ভাবে যোগ হবে
          </div>
        </div>

      </div>
    </div>
  );
};
