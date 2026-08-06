import React, { useState, useEffect } from 'react';
import { dispatchDirectOffer, fetchAutoDispatchCoupons, stopAutoDispatchCoupon } from '../../services/api';
import { Send, Gift, Users, Mail, AlertCircle, CheckCircle, Zap, Trash2, RefreshCw } from 'lucide-react';

interface AutoCampaign {
  id: string;
  title: string;
  code: string;
  discount_type: string;
  discount_value: number;
  enabled: boolean;
  created_at: string;
}

export const DirectCouponDispatcher: React.FC = () => {
  const [title, setTitle] = useState('🎁 Eid Special Gift Discount Coupon!');
  const [code, setCode] = useState('EID200');
  const [type, setType] = useState<'percentage' | 'fixed'>('fixed');
  const [value, setValue] = useState(200);
  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [customerEmail, setCustomerEmail] = useState('');
  const [autoEnrollFuture, setAutoEnrollFuture] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoCampaigns, setAutoCampaigns] = useState<AutoCampaign[]>([]);

  useEffect(() => {
    loadAutoCampaigns();
  }, []);

  const loadAutoCampaigns = async () => {
    try {
      const res = await fetchAutoDispatchCoupons();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setAutoCampaigns(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code || value === undefined) {
      alert('Please enter coupon name, code, and discount value.');
      return;
    }
    if (target === 'specific' && !customerEmail) {
      alert('Please enter customer email address.');
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const res = await dispatchDirectOffer({
        title,
        code,
        discount_type: type,
        discount_value: value,
        target,
        customer_email: customerEmail,
        auto_enroll_future: autoEnrollFuture
      });

      if (res && res.status === 'success') {
        setMessage({ type: 'success', text: res.message || 'Coupon successfully dispatched to accounts!' });
        setCode(`GIFT${Math.floor(100 + Math.random() * 900)}`);
        loadAutoCampaigns();
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to dispatch coupon.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Cannot connect to the server.' });
    } finally {
      setSending(false);
    }
  };

  const handleStopAutoCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to stop this auto-dispatch campaign?')) return;
    try {
      const res = await stopAutoDispatchCoupon(id);
      if (res && res.status === 'success') {
        loadAutoCampaigns();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '16px', marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Gift size={24} style={{ color: '#ec4899' }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Direct Coupon Dispatcher (Send Offers Directly to Customer Accounts)
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            Submitting an offer here will instantly deliver it to the "My Coupons" section of customer accounts.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem'
          }}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Offer Title
            </label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='🎁 Eid Special Gift Discount Coupon!'
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Coupon Code
            </label>
            <input
              type="text"
              className="input-field"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EID200"
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Discount Type
            </label>
            <select
              className="input-field"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="fixed">Fixed Amount (৳)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Discount Value
            </label>
            <input
              type="number"
              className="input-field"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              placeholder="200"
              required
            />
          </div>
        </div>

        {/* Target Audience & Auto-Enroll Checkbox */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Target Audience
            </label>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="target"
                  checked={target === 'all'}
                  onChange={() => setTarget('all')}
                />
                <Users size={16} />
                <span>All Registered Customers</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="target"
                  checked={target === 'specific'}
                  onChange={() => setTarget('specific')}
                />
                <Mail size={16} />
                <span>Specific Email</span>
              </label>
            </div>
          </div>

          {/* Auto-Dispatch Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <input
                type="checkbox"
                checked={autoEnrollFuture}
                onChange={(e) => setAutoEnrollFuture(e.target.checked)}
              />
              <Zap size={18} />
              <span>Auto-dispatch this offer to new accounts registered in the future</span>
            </label>
          </div>
        </div>

        {target === 'specific' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Customer Email
            </label>
            <input
              type="email"
              className="input-field"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
              required
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={sending}
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: sending ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px -4px rgba(236, 72, 153, 0.5)'
            }}
          >
            <Send size={18} />
            <span>{sending ? 'Sending...' : '🚀 Dispatch Offer to Accounts'}</span>
          </button>
        </div>
      </form>

      {/* Active Auto-Dispatch Campaigns Manager List */}
      {autoCampaigns.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} style={{ color: '#f59e0b' }} />
            <span>Active Auto-Dispatch Campaigns (For Future Registered Members)</span>
          </h4>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Offer Name</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Coupon Code</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Value</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {autoCampaigns.map((camp) => (
                  <tr key={camp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{camp.title}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>{camp.code}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {camp.discount_type === 'percentage' ? `${camp.discount_value}% OFF` : `৳${camp.discount_value} OFF`}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleStopAutoCampaign(camp.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Stop Auto-Dispatch</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

