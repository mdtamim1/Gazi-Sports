import React, { useState, useEffect } from 'react';
import { fetchCustomerCoupons } from '../services/api';
import { Ticket, Copy, Check, Sparkles, Gift, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface CustomerCoupon {
  id: number;
  code: string;
  title: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  status: string;
  source: string;
  created_at: string;
}

export const CustomerCouponsTab: React.FC<{ email: string }> = ({ email }) => {
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (email) {
      loadCoupons();
    }
  }, [email]);

  const loadCoupons = async () => {
    if (!email) return;
    setLoading(true);

    const cacheKey = `customer_coupons_${email.trim().toLowerCase()}`;
    // 1. Read local cache first
    const localStored = localStorage.getItem(cacheKey);
    if (localStored) {
      try {
        const parsed = JSON.parse(localStored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCoupons(parsed);
        }
      } catch (e) {}
    }

    try {
      // 2. Fetch fresh coupons from backend
      const res = await fetchCustomerCoupons(email);
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setCoupons(res.data);
        localStorage.setItem(cacheKey, JSON.stringify(res.data));
      }
    } catch (e) {
      console.error('Failed to load customer coupons:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
        <div>আপনার কুপনগুলো লোড হচ্ছে...</div>
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => c.status !== 'used');

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={22} style={{ color: '#fbbf24' }} />
            <span>আমার কুপন ও স্পেশাল অফারসমূহ (My Coupons)</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            আপনার অ্যাকাউন্টে জমা হওয়া সকল ডিসকাউন্ট কুপন নিচে দেওয়া হলো। চেকআউটে কপি করে ব্যবহার করুন।
          </p>
        </div>

        <button
          onClick={loadCoupons}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem'
          }}
        >
          <RefreshCw size={14} />
          <span>রিফ্রেশ</span>
        </button>
      </div>

      {activeCoupons.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
          <Gift size={40} style={{ color: '#94a3b8', margin: '0 auto 12px auto' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>কোনো কুপন কোড নেই</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            লটারি হুইল ঘুরিয়ে অথবা কেনাকাটা করে আপনার প্রথম কুপনটি সংগ্রহ করুন!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {activeCoupons.map((coupon) => {
            const isUsed = coupon.status === 'used';
            const isPercentage = coupon.discount_type === 'percentage';
            const displayValue = isPercentage ? `${coupon.discount_value}% OFF` : `৳${coupon.discount_value} OFF`;

            return (
              <div
                key={coupon.id}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, rgba(23, 20, 52, 0.8), rgba(13, 10, 31, 0.9))',
                  border: `1px solid ${isUsed ? 'rgba(255,255,255,0.1)' : 'rgba(251, 191, 36, 0.4)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  opacity: isUsed ? 0.6 : 1,
                  boxShadow: isUsed ? 'none' : '0 10px 25px -5px rgba(251, 191, 36, 0.15)',
                  overflow: 'hidden'
                }}
              >
                {/* Source Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      background: coupon.source === 'admin_gift' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(124, 58, 237, 0.2)',
                      color: coupon.source === 'admin_gift' ? '#f472b6' : '#a78bfa',
                      border: `1px solid ${coupon.source === 'admin_gift' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(124, 58, 237, 0.4)'}`,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {coupon.source === 'admin_gift' ? <Gift size={12} /> : <Sparkles size={12} />}
                    <span>{coupon.source === 'admin_gift' ? 'বিশেষ উপহার' : 'লটারি চাকা'}</span>
                  </span>

                  <span
                    style={{
                      color: isUsed ? '#94a3b8' : '#10b981',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isUsed ? 'ব্যবহৃত' : 'সক্রিয়'}
                  </span>
                </div>

                {/* Title & Value */}
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  {coupon.title || 'স্পেশাল ডিসকাউন্ট'}
                </h4>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', marginBottom: '16px' }}>
                  {displayValue}
                </div>

                {/* Coupon Code Box */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px dashed rgba(251, 191, 36, 0.6)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '1.5px' }}>
                    {coupon.code}
                  </span>
                  <button
                    onClick={() => handleCopy(coupon.code)}
                    disabled={isUsed}
                    style={{
                      background: copiedCode === coupon.code ? '#16a34a' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: isUsed ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedCode === coupon.code ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCode === coupon.code ? 'কপি হয়েছে!' : 'কপি'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
