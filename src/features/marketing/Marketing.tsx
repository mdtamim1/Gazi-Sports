import { useState, useEffect } from 'react';
import { Ticket, X, Trash2, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '../../mock/data';
import { 
  fetchCoupons, 
  createCoupon, 
  deleteCoupon 
} from '../../services/api';

export default function Marketing() {
  // Modals state
  const [showCouponModal, setShowCouponModal] = useState(false);

  // Marketing database states
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states (Coupon Creation)
  const [coupCode, setCoupCode] = useState('');
  const [coupType, setCoupType] = useState('percentage');
  const [coupVal, setCoupVal] = useState(15);
  const [coupExpiry, setCoupExpiry] = useState('2026-07-31');

  const loadMarketingData = async () => {
    setLoading(true);
    try {
      const couponData = await fetchCoupons();
      if (couponData) setCoupons(couponData);
    } catch (e) {
      setErrorMsg('ডাটাবেজ থেকে কুপন ডাটা লোড করা যাচ্ছে না।');
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
          <h1 className="page-title">Marketing Control Center</h1>
          <p className="page-subtitle">Manage promo coupons & discount codes</p>
        </div>
        <div className="page-header-actions">
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
                  কোনো কুপন কোড পাওয়া যায়নি।
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
