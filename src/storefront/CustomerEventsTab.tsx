import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, Calendar, CheckCircle2, Ticket, ArrowRight, Copy, Check } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { fetchCustomerAchievements } from '../services/api';

interface Achievement {
  id: number;
  event_id: string;
  reward_code: string;
  claimed_at: string;
  event_title: string;
  event_description: string;
}

export const CustomerEventsTab: React.FC = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const loadAchievements = async () => {
    if (!customer || !customer.email) return;
    setLoading(true);
    const res = await fetchCustomerAchievements(customer.email);
    if (res && res.status === 'success') {
      setAchievements(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAchievements();
  }, [customer]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedMap(prev => ({ ...prev, [code]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [code]: false }));
    }, 2000);
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--sf-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={24} style={{ color: '#fbbf24' }} />
          <span>আমার ইভেন্ট ও অ্যাচিভমেন্টসমূহ (Events & Achievements)</span>
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--sf-text-tertiary)' }}>
          আমাদের বিভিন্ন কুইজ ও গেমিং ইভেন্টগুলোতে অংশগ্রহণ করে সফলভাবে আনলক করা বিশেষ পুরস্কার কোডসমূহ।
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>লোড হচ্ছে...</div>
      ) : achievements.length === 0 ? (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            border: '1.5px dashed var(--sf-border)', 
            borderRadius: '16px',
            background: '#fafafa'
          }}
        >
          <Trophy size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>এখনো কোনো ইভেন্ট সম্পন্ন করেননি</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--sf-text-tertiary)' }}>
            আমাদের লাইভ ইভেন্টগুলোতে অংশ নিয়ে খুব সহজেই জিতে নিতে পারেন ডিসকাউন্ট কুপন কোড।
          </p>
          <button
            onClick={() => navigate('/events')}
            style={{
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>সক্রিয় ইভেন্টগুলো দেখুন</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {achievements.map((ach) => (
            <div 
              key={ach.id}
              style={{
                background: 'white',
                border: '1.5px solid var(--sf-border)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>
                    {ach.event_title}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: 'var(--sf-text-tertiary)', lineHeight: 1.4 }}>
                    {ach.event_description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--sf-text-tertiary)' }}>
                    <Calendar size={12} />
                    <span>অর্জনের তারিখ: {new Date(ach.claimed_at).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>

                <span style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} />
                  <span>সম্পন্ন (Achieved)</span>
                </span>
              </div>

              {/* Coupon Reward Block */}
              <div 
                style={{ 
                  background: '#f8fafc', 
                  border: '1.5px dashed #cbd5e1', 
                  borderRadius: '12px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ticket size={16} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>ডিসকাউন্ট কোড:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#16a34a', fontSize: '1rem', marginLeft: '4px' }}>
                    {ach.reward_code}
                  </span>
                </div>

                <button
                  onClick={() => handleCopy(ach.reward_code)}
                  style={{
                    background: 'white',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedMap[ach.reward_code] ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
                  <span>{copiedMap[ach.reward_code] ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
