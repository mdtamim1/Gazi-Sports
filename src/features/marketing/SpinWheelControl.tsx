import React, { useState, useEffect } from 'react';
import { fetchSpinWheelConfig, updateSpinWheelSettings } from '../../services/api';
import { DirectCouponDispatcher } from './DirectCouponDispatcher';
import { Sparkles, Save, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, HelpCircle, ShoppingBag } from 'lucide-react';

interface WheelSlice {
  id: string;
  label: string;
  coupon_code: string;
  type: 'percentage' | 'fixed';
  value: number;
  weight: number;
  color: string;
}

export const SpinWheelControl: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('🎁 ঘুরে জিতুন স্পেশাল ডিসকাউন্ট!');
  const [subtitle, setSubtitle] = useState('আজকের সৌভাগ্যজনক কুপন কোড জিততে চাকাটি ঘোরান!');
  const [respinOrderCount, setRespinOrderCount] = useState(1);
  const [slices, setSlices] = useState<WheelSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetchSpinWheelConfig();
      if (res && res.status === 'success' && res.data) {
        setEnabled(Boolean(res.data.enabled));
        setTitle(res.data.title || '🎁 ঘুরে জিতুন স্পেশাল ডিসকাউন্ট!');
        setSubtitle(res.data.subtitle || 'আজকের সৌভাগ্যজনক কুপন কোড জিততে চাকাটি ঘোরান!');
        setRespinOrderCount(Number(res.data.respin_order_count_required) || 1);
        setSlices(res.data.slices || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = slices.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

  const handleSliceChange = (index: number, field: keyof WheelSlice, value: any) => {
    const updated = [...slices];
    updated[index] = { ...updated[index], [field]: value };
    setSlices(updated);
  };

  const handleAddSlice = () => {
    const newId = String(Date.now());
    const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#06b6d4'];
    const nextColor = colors[slices.length % colors.length];

    setSlices([
      ...slices,
      {
        id: newId,
        label: '10% OFF',
        coupon_code: `OFFER${slices.length + 1}`,
        type: 'percentage',
        value: 10,
        weight: 10,
        color: nextColor
      }
    ]);
  };

  const handleDeleteSlice = (index: number) => {
    if (slices.length <= 2) {
      alert('স্পিন হুইলে কমপক্ষে ২টি স্লাইস থাকতে হবে।');
      return;
    }
    setSlices(slices.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateSpinWheelSettings({
        enabled,
        title,
        subtitle,
        respin_order_count_required: respinOrderCount,
        slices
      });

      if (res && res.status === 'success') {
        setMessage({ type: 'success', text: 'স্পিন হুইল সেটিংস সফলভাবে সেভ করা হয়েছে!' });
      } else {
        setMessage({ type: 'error', text: res.message || 'সেটিংস সেভ করতে ব্যর্থ হয়েছে।' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'সার্ভারে সংযোগ করা যাচ্ছে না।' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
        <div>স্পিন হুইল কন্ট্রোল লোড হচ্ছে...</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '16px' }}>
      {/* Title & Master Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Sparkles size={22} style={{ color: '#f59e0b' }} />
            <span>Spin & Win Wheel Controller</span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            ওয়েবসাইটে কাস্টমারদের জন্য লটারি চাকা অন/অফ করুন এবং জেতার সম্ভাবনা (Win Probability) কাস্টমাইজ করুন।
          </p>
        </div>

        {/* Master ON/OFF Switch */}
        <button
          onClick={() => setEnabled(!enabled)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${enabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: enabled ? '#10b981' : '#ef4444',
            padding: '8px 16px',
            borderRadius: '30px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}
        >
          {enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          <span>{enabled ? 'স্পিন হুইল চালু (ON)' : 'স্পিন হুইল বন্ধ (OFF)'}</span>
        </button>
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
          <AlertCircle size={18} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            পপআপ টাইটেল (Modal Title)
          </label>
          <input
            type="text"
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="🎁 ঘুরে জিতুন স্পেশাল ডিসকাউন্ট!"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            সাব-টাইটেল (Subtitle)
          </label>
          <input
            type="text"
            className="input-field"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="আজকের সৌভাগ্যজনক কুপন কোড জিততে চাকাটি ঘোরান!"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            পুনরায় ঘোরানোর অর্ডার রিকোয়ারমেন্ট (Re-Spin Orders)
          </label>
          <input
            type="number"
            className="input-field"
            value={respinOrderCount}
            onChange={(e) => setRespinOrderCount(Math.max(1, Number(e.target.value)))}
            min={1}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
            কাস্টমার ১টি স্পিন করার পর আবার ঘুরানোর জন্য কতটি সফল অর্ডার প্রয়োজন।
          </span>
        </div>
      </div>

      {/* Slices Customization Table */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            চাকার স্লাইস ও জেতার সম্ভাবনা (Slices & Win Weights)
          </h4>
          <button
            onClick={handleAddSlice}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>স্লাইস যোগ করুন</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>কালার</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>স্লাইসের লেখা</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>কুপন কোড</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>ছাড়ের ধরন</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>ছাড়ের পরিমাণ</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Weight / চান্স</span>
                    <span title="Weight যত বেশি হবে, এই অফারটি কাস্টমারদের কাছে পড়ার সম্ভাবনা তত বেশি হবে।"><HelpCircle size={14} /></span>
                  </div>
                </th>
                <th style={{ padding: '10px', textAlign: 'center' }}>পড়ার সম্ভাবনা (%)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>একশন</th>
              </tr>
            </thead>
            <tbody>
              {slices.map((slice, i) => {
                const prob = totalWeight > 0 ? ((Number(slice.weight) / totalWeight) * 100).toFixed(1) : '0';
                return (
                  <tr key={slice.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Color picker */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="color"
                        value={slice.color || '#8b5cf6'}
                        onChange={(e) => handleSliceChange(i, 'color', e.target.value)}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                      />
                    </td>
                    {/* Label */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={slice.label}
                        onChange={(e) => handleSliceChange(i, 'label', e.target.value)}
                        style={{ padding: '6px 10px' }}
                      />
                    </td>
                    {/* Coupon Code */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={slice.coupon_code}
                        onChange={(e) => handleSliceChange(i, 'coupon_code', e.target.value.toUpperCase())}
                        style={{ padding: '6px 10px', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </td>
                    {/* Type */}
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        className="input-field"
                        value={slice.type}
                        onChange={(e) => handleSliceChange(i, 'type', e.target.value)}
                        style={{ padding: '6px 10px' }}
                      >
                        <option value="percentage">পার্সেন্টেজ (%)</option>
                        <option value="fixed">ফিক্সড টাকা (৳)</option>
                      </select>
                    </td>
                    {/* Value */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        className="input-field"
                        value={slice.value}
                        onChange={(e) => handleSliceChange(i, 'value', Number(e.target.value))}
                        style={{ padding: '6px 10px', width: '90px' }}
                      />
                    </td>
                    {/* Weight */}
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        className="input-field"
                        value={slice.weight}
                        onChange={(e) => handleSliceChange(i, 'weight', Number(e.target.value))}
                        style={{ padding: '6px 10px', width: '90px' }}
                      />
                    </td>
                    {/* Probability % Badge */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span
                        style={{
                          background: Number(prob) > 25 ? 'rgba(16, 185, 129, 0.2)' : Number(prob) > 10 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: Number(prob) > 25 ? '#10b981' : Number(prob) > 10 ? '#f59e0b' : '#ef4444',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        {prob}%
                      </span>
                    </td>
                    {/* Delete action */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteSlice(i)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 20px -4px rgba(139, 92, 246, 0.5)'
          }}
        >
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          <span>{saving ? 'সেভ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
        </button>
      </div>

      {/* DIRECT COUPON DISPATCHER PANEL */}
      <DirectCouponDispatcher />
    </div>
  );
};
