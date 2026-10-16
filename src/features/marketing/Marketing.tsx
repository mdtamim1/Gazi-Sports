import { useState, useEffect } from 'react';
import { 
  Ticket, X, Trash2, CheckCircle, Clock, Copy, Check, ExternalLink, 
  Sparkles, Layers, RefreshCw, HelpCircle, ArrowRight, Download, Globe 
} from 'lucide-react';
import { formatDate } from '../../mock/data';
import { 
  fetchCoupons, 
  createCoupon, 
  deleteCoupon 
} from '../../services/api';

export default function Marketing() {
  // Modals state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Marketing database states
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states (Coupon Creation)
  const [coupCode, setCoupCode] = useState('');
  const [coupType, setCoupType] = useState('percentage');
  const [coupVal, setCoupVal] = useState(15);
  const [coupExpiry, setCoupExpiry] = useState('2026-07-31');

  const feedBaseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://gazisports24.com';
  const metaXmlUrl = `${feedBaseUrl}/facebook-feed.xml`;
  const metaCsvUrl = `${feedBaseUrl}/facebook-feed.csv`;
  const googleXmlUrl = `${feedBaseUrl}/google-merchant.xml`;

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const loadMarketingData = async () => {
    setLoading(true);
    try {
      const couponData = await fetchCoupons();
      if (couponData) setCoupons(couponData);
    } catch {
      setErrorMsg('Failed to load coupon data from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketingData();
  }, []);

  // Coupon Actions
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupCode) return;

    const res = await createCoupon({
      code: coupCode.toUpperCase().trim(),
      type: coupType,
      value: coupVal,
      expiry: coupExpiry
    });

    if (res.status === 'success') {
      setCoupons(prev => [res.data, ...prev]);
      setCoupCode('');
      setShowCouponModal(false);
    } else {
      alert(res.message || 'Failed to create coupon code');
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (confirm(`Delete coupon code ${code}?`)) {
      const res = await deleteCoupon(code);
      if (res.status === 'success') {
        setCoupons(prev => prev.filter(c => c.code !== code));
      } else {
        alert(res.message || 'Failed to delete coupon');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const activeCouponsCount = coupons.filter(c => c.status === 'active').length;
  const expiredCouponsCount = coupons.filter(c => c.status !== 'active').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Marketing</span></div>
          <h1 className="page-title">Marketing & Ads Control Center</h1>
          <p className="page-subtitle">Manage Meta Dynamic Product Catalog feeds & promo coupon codes</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowGuide(!showGuide)}>
            <HelpCircle size={16} /> {showGuide ? 'Hide Guide' : 'Ads Setup Guide'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowCouponModal(true)}>
            <Ticket size={16} /> Create Coupon
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: 'var(--text-xs)', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {/* META / FACEBOOK PRODUCT CATALOG FEED SECTION */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(24, 119, 242, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid rgba(24, 119, 242, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}>
                <Sparkles size={12} /> Auto-Sync Active
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                সব প্রোডাক্ট স্বয়ংক্রিয়ভাবে ফেসবুক ক্যাটালগে সিঙ্ক হচ্ছে
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={22} style={{ color: '#1877F2' }} />
              Meta &amp; Facebook Dynamic Product Catalog Feed
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.5 }}>
              ওয়েবসাইটে নতুন কোনো প্রোডাক্ট যোগ বা এডিট করলেই স্বয়ংক্রিয়ভাবে ফেসবুক ক্যাটালগে চলে যাবে। নিচে থাকা XML ফিড লিংকটি Meta Commerce Manager-এ একবার সেট করে দিলেই Carousel ও Collection Ads রান করার সময় ইচ্ছামতো প্রোডাক্ট নির্বাচন করতে পারবেন।
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => window.open(metaXmlUrl, '_blank')}
              title="Test dynamic XML output in new tab"
            >
              <ExternalLink size={14} /> Open Live Feed
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => handleCopy(metaXmlUrl, 'xml_top')}
              style={{ background: '#1877F2', borderColor: '#1877F2' }}
            >
              {copiedKey === 'xml_top' ? <><Check size={14} /> Copied URL!</> : <><Copy size={14} /> Copy Catalog Link</>}
            </button>
          </div>
        </div>

        {/* FEED URL DISPLAY BOXES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {/* XML Feed Box */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                <Globe size={15} style={{ color: '#10B981' }} />
                <span>XML Catalog Feed</span>
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>Recommended</span>
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ padding: '4px 8px', height: '26px', fontSize: '11px', color: copiedKey === 'xml' ? 'var(--color-success)' : 'inherit' }}
                onClick={() => handleCopy(metaXmlUrl, 'xml')}
              >
                {copiedKey === 'xml' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
              userSelect: 'all'
            }}>
              {metaXmlUrl}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', display: 'flex', gap: '12px' }}>
              <span>✓ RSS 2.0 Standard</span>
              <span>✓ Includes Additional Gallery Photos</span>
              <span>✓ Live Discount / Sale Pricing</span>
            </div>
          </div>

          {/* CSV Feed Box */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                <Download size={15} style={{ color: '#6366F1' }} />
                <span>CSV Catalog Feed</span>
                <span className="badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-tertiary)' }}>Alternative</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ padding: '4px 8px', height: '26px', fontSize: '11px' }}
                  onClick={() => window.open(metaCsvUrl, '_blank')}
                  title="Download CSV"
                >
                  <Download size={12} />
                </button>
                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ padding: '4px 8px', height: '26px', fontSize: '11px', color: copiedKey === 'csv' ? 'var(--color-success)' : 'inherit' }}
                  onClick={() => handleCopy(metaCsvUrl, 'csv')}
                >
                  {copiedKey === 'csv' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
              userSelect: 'all'
            }}>
              {metaCsvUrl}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', display: 'flex', gap: '12px' }}>
              <span>✓ Direct CSV download</span>
              <span>✓ Supports manual import</span>
              <span>✓ Excel &amp; Sheets compatible</span>
            </div>
          </div>

          {/* Google Merchant Feed Box */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                <Globe size={15} style={{ color: '#F59E0B' }} />
                <span>Google Merchant XML Feed</span>
                <span className="badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }}>Google Ads</span>
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ padding: '4px 8px', height: '26px', fontSize: '11px', color: copiedKey === 'google' ? 'var(--color-success)' : 'inherit' }}
                onClick={() => handleCopy(googleXmlUrl, 'google')}
              >
                {copiedKey === 'google' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
              userSelect: 'all'
            }}>
              {googleXmlUrl}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', display: 'flex', gap: '12px' }}>
              <span>✓ Google Shopping Ads</span>
              <span>✓ Auto Free Listings</span>
              <span>✓ BDT Currency</span>
            </div>
          </div>
        </div>

        {/* STEP-BY-STEP INSTRUCTION ACCORDION / GUIDE */}
        {showGuide && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(10px)',
            border: '1px dashed rgba(24, 119, 242, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginTop: '12px'
          }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={15} style={{ color: '#1877F2' }} />
              ফেসবুকে ক্যাটালগ সেটআপ ও অ্যাড রান করার সহজ ৩টি ধাপ:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12px', color: '#1877F2', marginBottom: '4px' }}>
                  <span>ধাপ ১: কমার্স ম্যানেজারে লিংক দিন</span>
                  <ArrowRight size={12} />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" style={{ color: '#1877F2', fontWeight: 600 }}>Commerce Manager</a> এ যান ➔ <b>Catalogues</b> ➔ <b>Data Sources</b> ➔ <b>Add items</b> ➔ <b>Data feed</b> বেছে নিন।
                </p>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12px', color: '#10B981', marginBottom: '4px' }}>
                  <span>ধাপ ২: অটো শিডিউল সিলেক্ট করুন</span>
                  <ArrowRight size={12} />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <b>Scheduled feed</b> সিলেক্ট করুন। ফিড URL এ উপরের <code>XML Link</code> পেস্ট করুন। Currency <b>BDT</b> সিলেক্ট করে <b>Upload</b> দিন। ফেসবুক প্রতি ঘণ্টায় অটো আপডেট নিবে!
                </p>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12px', color: '#8B5CF6', marginBottom: '4px' }}>
                  <span>ধাপ ৩: অ্যাডসে প্রোডাক্ট বাছুন</span>
                  <Sparkles size={12} />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Ads Manager-এ <b>Catalog Sales</b> বা <b>Carousel / Collection Ads</b> সিলেক্ট করুন। ক্যাটালগের <b>Sets</b> থেকে যে যে প্রোডাক্টের অ্যাড চালাতে চান তা সিলেক্ট করে দিন।
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Promo Codes', value: coupons.length.toString(), icon: Ticket, color: 'primary' },
          { label: 'Active Coupons', value: activeCouponsCount.toString(), icon: CheckCircle, color: 'success' },
          { label: 'Expired / Inactive', value: expiredCouponsCount.toString(), icon: Clock, color: 'warning' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stat-card-header">
                <div className={`stat-card-icon ${s.color}`}><Icon size={20} /></div>
              </div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* COUPONS MATRIX PANEL */}
      <div className="data-table-container">
        <div className="data-table-header">
          <div className="data-table-title">Promo Coupons Matrix</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Coupon Code</th>
              <th>Discount Type</th>
              <th>Value</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                  No coupon codes found.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.code}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{c.code}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.type}</td>
                  <td style={{ fontWeight: 600 }}>
                    {c.type === 'percentage' ? `${c.value}%` : `৳${Number(c.value).toFixed(2)}`}
                  </td>
                  <td>{formatDate(c.expiry)}</td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteCoupon(c.code)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE COUPON MODAL */}
      {showCouponModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">Create Promo Code</span>
              <button onClick={() => setShowCouponModal(false)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCoupon}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Promo Code</label>
                  <input type="text" className="form-input" required value={coupCode} onChange={e => setCoupCode(e.target.value)} placeholder="e.g. EXTRA15" />
                </div>

                <div className="form-group">
                  <label className="form-label">Discount Type</label>
                  <select className="form-select" value={coupType} onChange={e => setCoupType(e.target.value)}>
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Cash Discount (৳)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Discount Value</label>
                  <input type="number" className="form-input" required value={coupVal || ''} onChange={e => setCoupVal(Number(e.target.value))} />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input type="date" className="form-input" required value={coupExpiry} onChange={e => setCoupExpiry(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCouponModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Code</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

