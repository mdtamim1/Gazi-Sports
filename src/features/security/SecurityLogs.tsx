import { useState, useEffect } from 'react';
import { 
  ShieldAlert, RefreshCw, Search, Calendar, Filter, X, 
  Eye, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, 
  Database, UserCheck, KeyRound, Globe, Smartphone, Monitor
} from 'lucide-react';
import { fetchSecurityLogs } from '../../services/api';

const actionTypeColors: Record<string, { bg: string; text: string; icon: any }> = {
  'LOGIN_SUCCESS': { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', icon: UserCheck },
  'LOGIN_FAILED': { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', icon: KeyRound },
  'LOGOUT': { bg: 'rgba(100, 116, 139, 0.12)', text: '#94a3b8', icon: KeyRound },
  'PRODUCT_CREATE': { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', icon: Database },
  'PRODUCT_UPDATE': { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', icon: Database },
  'PRODUCT_DELETE': { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', icon: Database },
  'ORDER_STATUS_UPDATE': { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4', icon: CheckCircle2 },
  'ORDER_ASSIGN': { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', icon: UserCheck },
  'EMPLOYEE_UPDATE': { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', icon: UserCheck },
  'EMPLOYEE_DELETE': { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', icon: AlertTriangle },
  'EMPLOYEE_INVITE': { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', icon: UserCheck },
  'ROLE_CREATE': { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', icon: ShieldAlert },
  'ROLE_UPDATE': { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', icon: ShieldAlert },
  'ROLE_DELETE': { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', icon: ShieldAlert },
  'SETTINGS_UPDATE': { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', icon: ShieldAlert }
};

export default function SecurityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filtering & Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [emailInput, setEmailInput] = useState('');
  const [actionType, setActionType] = useState('');
  const [dateInput, setDateInput] = useState('');
  
  // Details Modal State
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetchSecurityLogs(page, limit, emailInput, actionType, dateInput);
      if (response && response.status === 'success') {
        setLogs(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalCount(response.pagination.total || 0);
        }
      } else {
        setErrorMsg(response?.message || 'লগ লোড করতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      setErrorMsg('সার্ভারে যোগাযোগ করা যাচ্ছে না।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, limit, actionType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleClearFilters = () => {
    setEmailInput('');
    setActionType('');
    setDateInput('');
    setPage(1);
    // Directly invoke with cleared parameters
    setLoading(true);
    fetchSecurityLogs(1, limit, '', '', '')
      .then(response => {
        if (response && response.status === 'success') {
          setLogs(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalCount(response.pagination?.total || 0);
        }
      })
      .catch(() => setErrorMsg('সার্ভার থেকে লগ রিকোয়েস্ট ব্যর্থ হয়েছে।'))
      .finally(() => setLoading(false));
  };

  const parseUserAgent = (ua: string) => {
    if (!ua) return { os: 'Unknown OS', browser: 'Unknown Browser', isMobile: false };
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Google Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    const isMobile = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone');

    return { os, browser, isMobile };
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">
            <span>Home</span>
            <span className="page-breadcrumb-sep">/</span>
            <span>Security</span>
            <span className="page-breadcrumb-sep">/</span>
            <span>Logs</span>
          </div>
          <h1 className="page-title">Security & Audit Logs</h1>
          <p className="page-subtitle">
            অ্যাডমিন এবং এমপ্লয়িদের সকল নিরাপত্তা ও ডাটা পরিবর্তনের অ্যাক্টিভিটি অডিট ট্রেইল।
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(12px)' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Search Actor Email
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  placeholder="e.g. admin@vipcommerce.com" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Action Type
              </label>
              <select 
                className="form-control"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                style={{ backgroundColor: 'var(--bg-input, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}
              >
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="LOGOUT">Logout</option>
                <option value="PRODUCT_CREATE">Product Creation</option>
                <option value="PRODUCT_UPDATE">Product Update</option>
                <option value="PRODUCT_DELETE">Product Deletion</option>
                <option value="ORDER_STATUS_UPDATE">Order Status Update</option>
                <option value="ORDER_ASSIGN">Order Assignment</option>
                <option value="EMPLOYEE_UPDATE">Employee Update</option>
                <option value="EMPLOYEE_DELETE">Employee Deletion</option>
                <option value="EMPLOYEE_INVITE">Employee Invitation</option>
                <option value="ROLE_CREATE">Role Creation</option>
                <option value="ROLE_UPDATE">Role Update</option>
                <option value="ROLE_DELETE">Role Deletion</option>
                <option value="SETTINGS_UPDATE">Settings Change</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Filter By Date
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="date" 
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <Filter size={16} /> Filter
              </button>
              {(emailInput || actionType || dateInput) && (
                <button type="button" className="btn btn-secondary" onClick={handleClearFilters} style={{ padding: '0 12px' }}>
                  <X size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Logs Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Timestamp</th>
                <th style={{ width: '180px' }}>Action Type</th>
                <th>Actor & IP</th>
                <th>Details</th>
                <th style={{ width: '120px' }}>Device</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                    <div className="animate-spin" style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                    <div style={{ marginTop: '12px', fontSize: 'var(--text-sm)' }}>Logs loading...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
                    <ShieldAlert size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <div style={{ fontSize: 'var(--text-sm)' }}>কোনো লগ ডাটা পাওয়া যায়নি।</div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const cfg = actionTypeColors[log.action_type] || { bg: 'rgba(100, 116, 139, 0.12)', text: '#94a3b8', icon: ShieldAlert };
                  const ActionIcon = cfg.icon;
                  const uaInfo = parseUserAgent(log.user_agent);
                  
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            background: cfg.bg, 
                            color: cfg.text, 
                            border: `1px solid ${cfg.text}33`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <ActionIcon size={12} />
                          {log.action_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                            {log.user_email || 'anonymous_actor'}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Globe size={12} /> {log.ip_address || '127.0.0.1'}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          {uaInfo.isMobile ? <Smartphone size={16} /> : <Monitor size={16} />}
                          <span style={{ fontSize: 'var(--text-xs)' }} title={log.user_agent}>
                            {uaInfo.os} ({uaInfo.browser})
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedLog(log)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {!loading && logs.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-primary)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} log records
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <span>Rows per page:</span>
                <select 
                  className="form-control"
                  style={{ width: '70px', padding: '4px 8px', height: 'auto', fontSize: 'var(--text-xs)' }}
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="btn btn-ghost btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', alignSelf: 'center', padding: '0 8px' }}>
                  Page {page} of {totalPages}
                </span>
                <button 
                  className="btn btn-ghost btn-sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%', animation: 'scaleUp 0.25s ease' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--color-primary)' }} />
                Security Audit Log Details
              </div>
              <button className="modal-close" onClick={() => setSelectedLog(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>Log Reference ID</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'monospace' }}>#{selectedLog.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>Timestamp</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{new Date(selectedLog.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>Security Action Type</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>{selectedLog.action_type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>IP Address</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{selectedLog.ip_address || '127.0.0.1'}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>Operator (Actor)</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                  {selectedLog.user_email || 'anonymous'} (User ID: {selectedLog.user_id || 'system'})
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>Log Description Details</div>
                <div style={{ 
                  color: 'var(--text-primary)', 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: 'var(--text-sm)',
                  lineHeight: '1.5',
                  wordBreak: 'break-word'
                }}>
                  {selectedLog.details}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>User Agent (Device Info)</div>
                <div style={{ 
                  color: 'var(--text-secondary)', 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {selectedLog.user_agent || 'Unknown User Agent'}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
