import { useState, useEffect } from 'react';
import { Megaphone, Mail, MessageSquare, Bell, Share2, Ticket, Zap, Gift, Send, Play, Pause, BarChart2, X, Plus, Trash2, Eye, DollarSign, Sparkles } from 'lucide-react';
import { generateCampaigns, saveCampaigns, formatCurrency, formatDate } from '../../mock/data';
import { SpinWheelControl } from './SpinWheelControl';
import { 
  fetchCoupons, 
  createCoupon, 
  deleteCoupon, 
  fetchSubscribers, 
  deleteSubscriber,
  fetchProductsFromBackend,
  fetchCampaignsFromBackend,
  createCampaignInBackend,
  updateCampaignInBackend,
  deleteCampaignFromBackend
} from '../../services/api';

const typeConfig: Record<string, { icon: any; color: string }> = {
  email: { icon: Mail, color: 'primary' },
  sms: { icon: MessageSquare, color: 'success' },
  push: { icon: Bell, color: 'warning' },
  social: { icon: Share2, color: 'info' },
};

const statusConfig: Record<string, string> = {
  active: 'badge-success',
  draft: 'badge-warning',
  completed: 'badge-primary',
  paused: 'badge-danger',
};

export default function Marketing() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('campaigns');
  
  // Modals state
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);

  // Marketing database states
  const [coupons, setCoupons] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Flash Sale state
  const [flashSale, setFlashSale] = useState({
    title: 'Eid Megastore Flash Sale',
    discountPct: 25,
    status: 'active',
    itemsSold: 145,
    itemsTotal: 500,
    endsIn: '03:45:12'
  });

  // Loyalty Program state
  const [loyaltyPointsValue, setLoyaltyPointsValue] = useState(0.10); // 1 pt = ৳0.10
  const [loyaltyStatus, setLoyaltyStatus] = useState(true);
  const [loyaltyLeaderboard] = useState([
    { name: 'Sarah Khan', points: 420, spent: 42000 },
    { name: 'John Doe', points: 245, spent: 24500 },
    { name: 'Rahim Ahmed', points: 89, spent: 8900 }
  ]);

  // Form states (Campaign Creation)
  const [campName, setCampName] = useState('');
  const [campType, setCampType] = useState<'email' | 'sms' | 'push' | 'social'>('email');
  const [campMessage, setCampMessage] = useState('');
  const [campTarget, setCampTarget] = useState('All Customers');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Form states (Coupon Creation)
  const [coupCode, setCoupCode] = useState('');
  const [coupType, setCoupType] = useState('percentage');
  const [coupVal, setCoupVal] = useState(15);
  const [coupExpiry, setCoupExpiry] = useState('2026-07-31');

  const tabs = [
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'spin-wheel', label: 'Spin & Win Wheel', icon: Sparkles },
    { id: 'coupons', label: 'Coupons Matrix', icon: Ticket },
    { id: 'subscribers', label: 'Subscribers Log', icon: Mail },
    { id: 'flash', label: 'Flash Sales', icon: Zap },
    { id: 'loyalty', label: 'Loyalty Program', icon: Gift },
  ];

  const loadMarketingData = async () => {
    setLoading(true);
    try {
      const [couponData, subData, productData, campaignData] = await Promise.all([
        fetchCoupons(),
        fetchSubscribers(),
        fetchProductsFromBackend(),
        fetchCampaignsFromBackend()
      ]);
      if (couponData) setCoupons(couponData);
      if (subData) setSubscribers(subData);
      if (campaignData) {
        setCampaigns(campaignData);
      } else {
        // Fallback to local storage if API fails
        setCampaigns(generateCampaigns(15));
      }

      let finalProducts = productData;
      if (!finalProducts || finalProducts.length === 0) {
        const localConfig = localStorage.getItem('storefront_config');
        if (localConfig) {
          try {
            const parsed = JSON.parse(localConfig);
            if (parsed && Array.isArray(parsed.products)) {
              finalProducts = parsed.products;
            }
          } catch (err) {
            console.error('Error parsing storefront_config for marketing:', err);
          }
        }
      }
      if (!finalProducts || finalProducts.length === 0) {
        const localList = localStorage.getItem('productList');
        if (localList) {
          try {
            const parsed = JSON.parse(localList);
            if (Array.isArray(parsed)) {
              finalProducts = parsed;
            }
          } catch (err) {
            console.error('Error parsing productList for marketing:', err);
          }
        }
      }
      
      if (finalProducts) {
        setProducts(finalProducts);
      }
    } catch (e) {
      setErrorMsg('ডাটাবেজ থেকে কুপন, সাবস্ক্রাইবার ও প্রোডাক্ট ডাটা লোড করা যাচ্ছে না।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketingData();
  }, []);

  // Campaign Actions
  const handleToggleCampaign = async (id: string) => {
    const found = campaigns.find(c => c.id === id);
    if (!found) return;
    const nextStatus = found.status === 'active' ? 'paused' : 'active';
    
    // Optimistic UI update
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
    
    // Sync with backend SQLite
    await updateCampaignInBackend(id, nextStatus);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName) return;

    const newCamp = {
      id: `CMP-${String(campaigns.length + 1).padStart(3, '0')}`,
      name: campName,
      type: campType,
      status: 'active' as const,
      sent: campTarget === 'All Customers' ? 10000 : 2500,
      opened: 0,
      clicked: 0,
      converted: 0,
      revenue: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      productIds: selectedProductIds
    };

    // Optimistic UI update
    setCampaigns(prev => [newCamp, ...prev]);

    // Save to backend SQLite
    await createCampaignInBackend(newCamp);

    // Reset Form
    setCampName('');
    setCampMessage('');
    setSelectedProductIds([]);
    setProductSearchQuery('');
    setShowCampaignModal(false);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ক্যাম্পেইনটি ডিলিট করতে চান?')) return;
    
    // Optimistic UI update
    setCampaigns(prev => prev.filter(c => c.id !== id));
    
    // Sync with backend SQLite
    await deleteCampaignFromBackend(id);
  };

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

  // Subscriber Actions
  const handleDeleteSubscriber = async (id: number) => {
    if (confirm('Are you sure you want to remove this subscriber email?')) {
      const res = await deleteSubscriber(id);
      if (res.status === 'success') {
        setSubscribers(prev => prev.filter(sub => sub.id !== id));
      } else {
        alert(res.message || 'Failed to delete subscriber');
      }
    }
  };

  if (loading && coupons.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Marketing</span></div>
          <h1 className="page-title">Marketing Control Center</h1>
          <p className="page-subtitle">Manage campaigns, promo coupons, and email subscriptions</p>
        </div>
        <div className="page-header-actions">
          {activeTab === 'coupons' ? (
            <button className="btn btn-primary" onClick={() => setShowCouponModal(true)}><Ticket size={16} /> Create Coupon</button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowCampaignModal(true)}><Megaphone size={16} /> Create Campaign</button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: 'var(--text-xs)', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'active').length.toString(), icon: Play, color: 'success' },
          { label: 'Subscribed Emails', value: subscribers.length.toString(), icon: Mail, color: 'primary' },
          { label: 'Total Promo Codes', value: coupons.length.toString(), icon: Ticket, color: 'info' },
          { label: 'Campaign Revenue', value: formatCurrency(campaigns.reduce((acc, c) => acc + c.revenue, 0)), icon: DollarSign, color: 'warning' },
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

      <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* CAMPAIGNS PANEL */}
      {activeTab === 'campaigns' && (
        <div className="data-table-container">
          <div className="data-table-header">
            <div className="data-table-title">All Campaigns</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Open Rate</th>
                <th>Click Rate</th>
                <th>Conversion</th>
                <th>Revenue</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const TypeIcon = typeConfig[campaign.type].icon;
                const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : '0.0';
                const clickRate = campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : '0.0';
                const convRate = campaign.clicked > 0 ? ((campaign.converted / campaign.clicked) * 100).toFixed(1) : '0.0';
                
                return (
                  <tr key={campaign.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{campaign.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{campaign.id}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', textTransform: 'capitalize' }}>
                        <TypeIcon size={14} className={`text-${typeConfig[campaign.type].color}`} /> {campaign.type}
                      </div>
                    </td>
                    <td><span className={`badge ${statusConfig[campaign.status]}`}>{campaign.status}</span></td>
                    <td>{campaign.sent.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{openRate}%</span>
                        <div className="progress-bar" style={{ width: '40px', height: '4px' }}>
                          <div className="progress-fill success" style={{ width: `${openRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>{clickRate}%</td>
                    <td>{convRate}%</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>{formatCurrency(campaign.revenue)}</td>
                    <td style={{ fontSize: 'var(--text-xs)' }}>
                      {formatDate(campaign.startDate)} - <br/>{formatDate(campaign.endDate)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" title="Campaign Analytics" onClick={() => alert(`Analytics for ${campaign.name}`)}><BarChart2 size={14} /></button>
                        {campaign.status === 'active' ? (
                          <button className="btn btn-ghost btn-sm" title="Pause Campaign" onClick={() => handleToggleCampaign(campaign.id)}><Pause size={14} /></button>
                        ) : campaign.status === 'paused' ? (
                          <button className="btn btn-ghost btn-sm" title="Resume Campaign" onClick={() => handleToggleCampaign(campaign.id)}><Play size={14} /></button>
                        ) : null}
                        <button 
                          className="btn btn-ghost btn-sm text-danger" 
                          title="Delete Campaign" 
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SPIN & WIN WHEEL CONTROL PANEL */}
      {activeTab === 'spin-wheel' && <SpinWheelControl />}

      {/* COUPONS MATRIX PANEL */}
      {activeTab === 'coupons' && (
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
              {coupons.map((c) => (
                <tr key={c.code}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{c.code}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.type}</td>
                  <td style={{ fontWeight: 600 }}>
                    {c.type === 'percentage' ? `${c.value}%` : `৳${c.value.toFixed(2)}`}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEWSLETTER SUBSCRIBERS PANEL */}
      {activeTab === 'subscribers' && (
        <div className="data-table-container">
          <div className="data-table-header">
            <div className="data-table-title">Newsletter Subscriptions</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Subscriber Email</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                    কোনো নিউজলেটার সাবস্ক্রাইবার পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub.email}</td>
                    <td>
                      <span className="badge badge-success">
                        {sub.status}
                      </span>
                    </td>
                    <td>{new Date(sub.created_at).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteSubscriber(sub.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FLASH SALES PANEL */}
      {activeTab === 'flash' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <div className="card-header">
            <div>
              <div className="card-title">{flashSale.title}</div>
              <div className="card-subtitle">Eid Megastore Sale Campaign Configurator</div>
            </div>
            <span className={`badge ${flashSale.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
              {flashSale.status.toUpperCase()}
            </span>
          </div>
          <div className="card-body">
            <div className="grid-2" style={{ marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Discount Applied</div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>{flashSale.discountPct}% OFF Everything</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Time Remaining</div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-danger)' }}>{flashSale.endsIn}</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '8px' }}>
                <span>Campaign Progress (Stock sold)</span>
                <strong>{flashSale.itemsSold} / {flashSale.itemsTotal} Units Sold</strong>
              </div>
              <div className="progress-bar" style={{ height: '14px', borderRadius: '4px' }}>
                <div className="progress-fill success" style={{ width: `${(flashSale.itemsSold / flashSale.itemsTotal) * 100}%`, borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {flashSale.status === 'active' ? (
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => setFlashSale({ ...flashSale, status: 'paused' })}>
                  <Pause size={14} /> Pause Flash Sale
                </button>
              ) : (
                <button className="btn btn-success" style={{ flex: 1 }} onClick={() => setFlashSale({ ...flashSale, status: 'active' })}>
                  <Play size={14} /> Resume Flash Sale
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => {
                const discount = prompt('Enter new flash sale discount percentage (e.g. 30):');
                if (discount && !isNaN(Number(discount))) {
                  setFlashSale({ ...flashSale, discountPct: Number(discount) });
                }
              }}>Edit Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* LOYALTY PROGRAM PANEL */}
      {activeTab === 'loyalty' && (
        <div className="grid-1-2">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Loyalty Leaderboard</div>
                <div className="card-subtitle">Top customers accumulation records</div>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Earned Points</th>
                    <th>Converted Cash (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {loyaltyLeaderboard.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{item.points} pts</td>
                      <td>৳{(item.points * loyaltyPointsValue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Program Settings</div>
              </div>
              <button className={`form-switch ${loyaltyStatus ? 'active' : ''}`} onClick={() => setLoyaltyStatus(!loyaltyStatus)} />
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Points to Cash Conversion Rate</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-sm)' }}>1 Point = </span>
                  <input type="number" step="0.01" className="form-input" style={{ width: '80px', height: '34px' }} value={loyaltyPointsValue} onChange={e => setLoyaltyPointsValue(Number(e.target.value))} />
                  <span style={{ fontSize: 'var(--text-sm)' }}>BDT (৳)</span>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <strong>How points are earned:</strong> Customers automatically earn 1 loyalty point for every 100 Tk spent on the storefront checkout. Converted cash is redeemable in checkout.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {showCampaignModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Create Marketing Campaign</span>
              <button onClick={() => setShowCampaignModal(false)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Campaign Name</label>
                  <input type="text" className="form-input" required value={campName} onChange={e => setCampName(e.target.value)} placeholder="e.g. Summer Promo 2026" />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Campaign Type</label>
                    <select className="form-select" value={campType} onChange={e => setCampType(e.target.value as any)}>
                      <option value="email">Email Broadcast</option>
                      <option value="sms">SMS Text message</option>
                      <option value="push">Push Notification</option>
                      <option value="social">Social Media post</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Audience Segment</label>
                    <select className="form-select" value={campTarget} onChange={e => setCampTarget(e.target.value)}>
                      <option value="All Customers">All Customers (10K+)</option>
                      <option value="VIP Buyers">VIP Buyers (185)</option>
                      <option value="Inactive Customers">Inactive Customers (1.2K)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">সংশ্লিষ্ট পণ্যসমূহ (Associated Products - Select Multiple)</label>
                  
                  {/* Product Search Input */}
                  <input 
                    type="text" 
                    placeholder="পণ্য খুঁজুন (Search Product by Name or SKU)..." 
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ marginBottom: '8px', background: '#111827', border: '1px solid #1e293b', color: '#fff', fontSize: '0.85rem', height: '36px', boxSizing: 'border-box' }}
                  />

                  <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1.5px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#e2e8f0'
                  }}>
                    {products
                      .filter(p => 
                        p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                        (p.sku && p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()))
                      )
                      .map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(String(p.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds(prev => [...prev, String(p.id)]);
                              } else {
                                setSelectedProductIds(prev => prev.filter(id => id !== String(p.id)));
                              }
                            }}
                          />
                          <span>{p.name} (৳{p.price})</span>
                        </label>
                      ))
                    }
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Message Template / Body</label>
                  <textarea className="form-textarea" required value={campMessage} onChange={e => setCampMessage(e.target.value)} placeholder="Write campaign content..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCampaignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Launch Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
