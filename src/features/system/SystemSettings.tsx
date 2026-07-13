import { useState, useEffect } from 'react';
import { Globe, CreditCard, Truck, Mail, Database, Save, HardDrive, Play, Trash2, Download } from 'lucide-react';
import { systemSettings as mockSystemSettings } from '../../mock/data';
import { fetchSystemSettings, saveSystemSettings } from '../../services/api';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [dbSettings, setDbSettings] = useState<any | null>(null);

  // General Settings Form states
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [currency, setCurrency] = useState('BDT (৳)');
  const [timezone, setTimezone] = useState('Asia/Dhaka (GMT+6)');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Payment Methods Form states
  const [paymentBkash, setPaymentBkash] = useState(true);
  const [paymentNagad, setPaymentNagad] = useState(true);
  const [paymentSslCommerz, setPaymentSslCommerz] = useState(false);
  const [paymentCod, setPaymentCod] = useState(true);

  // Shipping Zones Form states
  const [shippingPathao, setShippingPathao] = useState(true);
  const [shippingSteadfast, setShippingSteadfast] = useState(true);
  const [shippingRedx, setShippingRedx] = useState(false);

  // Email Provider Form states
  const [emailProvider, setEmailProvider] = useState('SendGrid');
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // Cache & Performance Form states
  const [cacheDriver, setCacheDriver] = useState('Redis');
  const [cacheTTL, setCacheTTL] = useState(3600);

  // Backups Local states
  const [backups, setBackups] = useState([
    { id: '1', name: 'backup_db_prod_2026_06_25.sql', date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), size: '1.74 GB', status: 'completed' },
    { id: '2', name: 'backup_db_prod_2026_06_28.sql', date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), size: '1.81 GB', status: 'completed' },
  ]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load configuration from database on mount
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      const data = await fetchSystemSettings();
      if (data) {
        setDbSettings(data);
        setSiteName(data.siteName || '');
        setSiteUrl(data.siteUrl || '');
        setCurrency(data.currency || 'BDT (৳)');
        setTimezone(data.timezone || 'Asia/Dhaka (GMT+6)');
        setMaintenanceMode(!!data.maintenanceMode);
        
        setPaymentBkash(data.paymentBkash !== undefined ? !!data.paymentBkash : true);
        setPaymentNagad(data.paymentNagad !== undefined ? !!data.paymentNagad : true);
        setPaymentSslCommerz(!!data.paymentSslCommerz);
        setPaymentCod(data.paymentCod !== undefined ? !!data.paymentCod : true);
        
        setShippingPathao(data.shippingPathao !== undefined ? !!data.shippingPathao : true);
        setShippingSteadfast(data.shippingSteadfast !== undefined ? !!data.shippingSteadfast : true);
        setShippingRedx(!!data.shippingRedx);
        
        setEmailProvider(data.emailProvider || 'SendGrid');
        setSmtpHost(data.smtpHost || 'smtp.sendgrid.net');
        setSmtpPort(data.smtpPort || 587);
        setSmtpUser(data.smtpUser || '');
        setSmtpPass(data.smtpPass || '');
        
        setCacheDriver(data.cacheDriver || 'Redis');
        setCacheTTL(data.cacheTTL !== undefined ? Number(data.cacheTTL) : 3600);
      } else {
        // Fallback to mock settings
        setSiteName(mockSystemSettings.siteName);
        setSiteUrl(mockSystemSettings.siteUrl);
        setCurrency(mockSystemSettings.currency);
        setTimezone(mockSystemSettings.timezone);
        setMaintenanceMode(mockSystemSettings.maintenanceMode);
        
        setPaymentBkash(true);
        setPaymentNagad(true);
        setPaymentSslCommerz(false);
        setPaymentCod(true);
        
        setShippingPathao(true);
        setShippingSteadfast(true);
        setShippingRedx(false);
        
        setEmailProvider(mockSystemSettings.emailProvider || 'SendGrid');
        setSmtpHost(mockSystemSettings.smtpHost || 'smtp.sendgrid.net');
        setSmtpPort(mockSystemSettings.smtpPort || 587);
        setSmtpUser('apikey');
        setSmtpPass('••••••••••••••••••••');
        
        setCacheDriver(mockSystemSettings.cacheDriver || 'Redis');
        setCacheTTL(3600);
      }
      setIsLoading(false);
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    const updatedData = {
      siteName,
      siteUrl,
      currency,
      timezone,
      maintenanceMode,
      paymentBkash,
      paymentNagad,
      paymentSslCommerz,
      paymentCod,
      shippingPathao,
      shippingSteadfast,
      shippingRedx,
      emailProvider,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      cacheDriver,
      cacheTTL
    };

    const success = await saveSystemSettings(updatedData);
    setIsLoading(false);
    if (success) {
      alert('System settings saved successfully!');
    } else {
      alert('Failed to save settings. Operating in mock offline mode.');
    }
  };

  const handleCreateBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      const newBackup = {
        id: String(backups.length + 1),
        name: `backup_db_prod_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}_${Math.random().toString(36).substring(2, 6)}.sql`,
        date: new Date().toISOString(),
        size: '1.85 GB',
        status: 'completed'
      };
      setBackups([newBackup, ...backups]);
      setIsBackingUp(false);
      alert('New database backup created successfully!');
    }, 2000);
  };

  const handleRestoreBackup = (name: string) => {
    if (window.confirm(`Are you sure you want to restore the system database to backup file: "${name}"? Existing database data will be overwritten.`)) {
      alert('Database restored successfully! The system is restarting background services.');
    }
  };

  const handleDeleteBackup = (id: string) => {
    if (window.confirm('Are you sure you want to delete this backup file? This action is permanent.')) {
      setBackups(backups.filter(b => b.id !== id));
      alert('Backup file deleted successfully.');
    }
  };

  const handleFlushCache = () => {
    setIsFlushingCache(true);
    setTimeout(() => {
      setIsFlushingCache(false);
      alert('Redis cache flushed successfully! Cache metrics recalculated.');
    }, 1500);
  };

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Globe },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'shipping', label: 'Shipping Zones', icon: Truck },
    { id: 'email', label: 'Email Provider', icon: Mail },
    { id: 'cache', label: 'Cache & Performance', icon: Database },
    { id: 'backup', label: 'Backups', icon: HardDrive },
  ];

  const currentSettings = dbSettings || mockSystemSettings;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>System</span></div>
          <h1 className="page-title">System Control Center</h1>
          <p className="page-subtitle">Configure global platform settings, integrations, and performance</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
 
      <div className="content-grid">
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <div><div className="card-title">Settings Navigation</div></div>
          </div>
          <div className="card-body" style={{ padding: 'var(--space-2)' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                    cursor: 'pointer', borderRadius: 'var(--radius-md)',
                    background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </div>
              );
            })}
          </div>
        </div>
 
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div className="card-title">{tabs.find(t => t.id === activeTab)?.label}</div></div>
            {activeTab === 'backup' && (
              <button 
                className="btn btn-primary" 
                onClick={handleCreateBackup}
                disabled={isBackingUp}
              >
                <HardDrive size={16} style={{ marginRight: '8px' }} />
                {isBackingUp ? 'Backing Up...' : 'Create Backup'}
              </button>
            )}
          </div>
          <div className="card-body">
            
            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Store Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={siteName} 
                      onChange={(e) => setSiteName(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Store URL</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={siteUrl} 
                      onChange={(e) => setSiteUrl(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Currency</label>
                    <select 
                      className="form-select" 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="BDT (৳)">BDT (৳)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select 
                      className="form-select" 
                      value={timezone} 
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="Asia/Dhaka (GMT+6)">Asia/Dhaka (GMT+6)</option>
                      <option value="UTC">UTC (Universal Coordinated Time)</option>
                      <option value="EST">EST (Eastern Standard Time)</option>
                      <option value="PST">PST (Pacific Standard Time)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Maintenance Mode</span>
                    <div 
                      className={`form-switch ${maintenanceMode ? 'active' : ''}`} 
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      style={{ cursor: 'pointer' }}
                    />
                  </label>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>When active, the store storefront will display a "Coming Soon" page.</p>
                </div>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Enable or disable different checkout payment gateways on the customer storefront.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>bKash Checkout API</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Allows direct payments through secure bKash personal/merchant billing.</div>
                    </div>
                    <div 
                      className={`form-switch ${paymentBkash ? 'active' : ''}`} 
                      onClick={() => setPaymentBkash(!paymentBkash)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Nagad API Payment</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Process instant orders via the official Nagad payment gateway redirect.</div>
                    </div>
                    <div 
                      className={`form-switch ${paymentNagad ? 'active' : ''}`} 
                      onClick={() => setPaymentNagad(!paymentNagad)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>SSLCommerz Hosted Gateway</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Accept Visa, Mastercard, Amex, Internet Banking, and mobile banking wallets.</div>
                    </div>
                    <div 
                      className={`form-switch ${paymentSslCommerz ? 'active' : ''}`} 
                      onClick={() => setPaymentSslCommerz(!paymentSslCommerz)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Cash on Delivery (COD)</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Allow customers to place orders without paying online; pay upon delivery.</div>
                    </div>
                    <div 
                      className={`form-switch ${paymentCod ? 'active' : ''}`} 
                      onClick={() => setPaymentCod(!paymentCod)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Zones Tab */}
            {activeTab === 'shipping' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Manage third-party logistics integrations for auto-consignment and parcel tracking.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Pathao Delivery API</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Automate merchant orders booking and sync tracking URLs.</div>
                    </div>
                    <div 
                      className={`form-switch ${shippingPathao ? 'active' : ''}`} 
                      onClick={() => setShippingPathao(!shippingPathao)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Steadfast Courier API</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Fast delivery integration for nationwide Cash on Delivery handling.</div>
                    </div>
                    <div 
                      className={`form-switch ${shippingSteadfast ? 'active' : ''}`} 
                      onClick={() => setShippingSteadfast(!shippingSteadfast)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>RedX Logistics API</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Enterprise shipping tracking and automated delivery booking.</div>
                    </div>
                    <div 
                      className={`form-switch ${shippingRedx ? 'active' : ''}`} 
                      onClick={() => setShippingRedx(!shippingRedx)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Provider Tab */}
            {activeTab === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Email Service Provider</label>
                    <select 
                      className="form-select" 
                      value={emailProvider} 
                      onChange={(e) => setEmailProvider(e.target.value)}
                    >
                      <option value="SendGrid">SendGrid</option>
                      <option value="Mailgun">Mailgun</option>
                      <option value="SMTP">Custom SMTP Server</option>
                      <option value="SES">Amazon SES</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">SMTP Host</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={smtpHost} 
                      onChange={(e) => setSmtpHost(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SMTP Port</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={smtpPort} 
                      onChange={(e) => setSmtpPort(Number(e.target.value))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SMTP Username</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={smtpUser} 
                      placeholder="Enter username or api_key"
                      onChange={(e) => setSmtpUser(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">SMTP Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      value={smtpPass} 
                      placeholder="••••••••••••••••••••"
                      onChange={(e) => setSmtpPass(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            )}
 
            {/* Cache & Performance Tab */}
            {activeTab === 'cache' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="grid-3">
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Cache Driver</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{cacheDriver}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Hit Rate</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-success)' }}>{currentSettings.cacheHitRate}%</div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Memory Used</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{currentSettings.cacheSize}</div>
                  </div>
                </div>
                
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Select Cache Driver</label>
                    <select 
                      className="form-select" 
                      value={cacheDriver} 
                      onChange={(e) => setCacheDriver(e.target.value)}
                    >
                      <option value="Redis">Redis (Recommended)</option>
                      <option value="Memcached">Memcached</option>
                      <option value="File">Local File Cache</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cache Time-To-Live (TTL) (Seconds)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={cacheTTL} 
                      onChange={(e) => setCacheTTL(Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Flush Cache</label>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                    Clear the Redis cache to force the system to rebuild data from the database. This may temporarily increase load times.
                  </p>
                  <button 
                    className="btn btn-secondary" 
                    type="button"
                    onClick={handleFlushCache}
                    disabled={isFlushingCache}
                  >
                    {isFlushingCache ? 'Flushing Redis...' : 'Clear Redis Cache'}
                  </button>
                </div>
              </div>
            )}

            {/* Backups Tab */}
            {activeTab === 'backup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="grid-3" style={{ marginBottom: '10px' }}>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Total Backups</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{backups.length} Files</div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Backup Storage Used</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {(backups.length * 1.8).toFixed(2)} GB
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Last Backup Taken</div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {backups.length > 0 ? new Date(backups[0].date).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Backup Name</th>
                        <th>Created Date</th>
                        <th>File Size</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map(backup => (
                        <tr key={backup.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{backup.name}</td>
                          <td>{new Date(backup.date).toLocaleString()}</td>
                          <td>{backup.size}</td>
                          <td>
                            <span 
                              style={{ 
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--color-success)'
                              }}
                            >
                              {backup.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleRestoreBackup(backup.name)}
                                title="Restore database"
                              >
                                <Play size={12} /> Restore
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => alert(`Starting download for: ${backup.name}`)}
                                title="Download backup file"
                              >
                                <Download size={12} /> Download
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleDeleteBackup(backup.id)}
                                title="Delete backup file"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
