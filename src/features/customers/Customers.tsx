import { useState, useMemo } from 'react';
import { Users, Search, Filter, Download, UserPlus, Star, Shield, Heart, AlertTriangle, Eye } from 'lucide-react';
import { generateCustomers, formatCurrency, formatDate, timeAgo } from '../../mock/data';

const segmentColors: Record<string, string> = {
  'VIP': 'badge-purple', 'Regular': 'badge-primary', 'New': 'badge-success',
  'At-Risk': 'badge-warning', 'Churned': 'badge-danger',
};

export default function Customers() {
  const [customers] = useState(generateCustomers(50));
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let result = customers;
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));
    if (segmentFilter !== 'all') result = result.filter(c => c.segment === segmentFilter);
    return result;
  }, [customers, search, segmentFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleExportCustomers = () => {
    if (filtered.length === 0) {
      alert('No customers available to export.');
      return;
    }

    const headers = [
      'Customer ID',
      'Name',
      'Email',
      'Segment',
      'Total Spent (৳)',
      'Orders',
      'LTV (৳)',
      'Loyalty Points',
      'Risk Score',
      'Last Active'
    ];

    const rows = filtered.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      c.segment,
      c.totalSpent,
      c.orders,
      c.ltv,
      c.loyaltyPoints,
      c.riskScore,
      `"${c.lastActive}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Customers</span></div>
          <h1 className="page-title">Customer Control Center</h1>
          <p className="page-subtitle">Manage {customers.length.toLocaleString()} customers across all segments</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExportCustomers}><Download size={16} /> Export</button>
          <button className="btn btn-primary"><UserPlus size={16} /> Add Customer</button>
        </div>
      </div>

      {/* Segment Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Customers', value: '23,547', icon: Users, color: 'primary', change: '+12.3%' },
          { label: 'VIP Customers', value: '2,826', icon: Star, color: 'purple', change: '+8.7%' },
          { label: 'Avg Lifetime Value', value: '$2,340', icon: Heart, color: 'success', change: '+15.2%' },
          { label: 'At-Risk Customers', value: '4,238', icon: AlertTriangle, color: 'warning', change: '-3.1%' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stat-card-header">
                <div className={`stat-card-icon ${s.color}`}><Icon size={20} /></div>
                <span className={`stat-card-change positive`}>{s.change}</span>
              </div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="data-table-container" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="data-table-header">
          <div className="data-table-title">All Customers</div>
          <div className="data-table-actions">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ height: '34px', paddingLeft: '32px', width: '220px', fontSize: 'var(--text-xs)' }}
                placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select" style={{ height: '34px', width: '140px', fontSize: 'var(--text-xs)' }}
              value={segmentFilter} onChange={(e) => { setSegmentFilter(e.target.value); setPage(1); }}>
              <option value="all">All Segments</option>
              <option value="VIP">VIP</option>
              <option value="Regular">Regular</option>
              <option value="New">New</option>
              <option value="At-Risk">At-Risk</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Segment</th>
              <th>Total Spent</th>
              <th>Orders</th>
              <th>LTV</th>
              <th>Loyalty Pts</th>
              <th>Risk Score</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {customer.avatar}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{customer.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{customer.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`badge ${segmentColors[customer.segment]}`}>{customer.segment}</span></td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(customer.totalSpent)}</td>
                <td>{customer.orders}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(customer.ltv)}</td>
                <td>{customer.loyaltyPoints.toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="progress-bar" style={{ width: '50px' }}>
                      <div className={`progress-fill ${customer.riskScore > 70 ? 'danger' : customer.riskScore > 40 ? 'warning' : 'success'}`}
                        style={{ width: `${customer.riskScore}%` }} />
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)' }}>{customer.riskScore}</span>
                  </div>
                </td>
                <td style={{ fontSize: 'var(--text-xs)' }}>{timeAgo(customer.lastActive)}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCustomer(customer)}>
                    <Eye size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="data-table-footer">
          <span>Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}</span>
          <div className="pagination">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <button key={i} className={`pagination-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Customer Profile</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: 'white' }}>
                  {selectedCustomer.avatar}
                </div>
                <div>
                  <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{selectedCustomer.name}</h4>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{selectedCustomer.email}</p>
                  <span className={`badge ${segmentColors[selectedCustomer.segment]}`}>{selectedCustomer.segment}</span>
                </div>
              </div>
              <div className="grid-2">
                {[
                  { label: 'Total Spent', value: formatCurrency(selectedCustomer.totalSpent) },
                  { label: 'Orders', value: selectedCustomer.orders.toString() },
                  { label: 'Lifetime Value', value: formatCurrency(selectedCustomer.ltv) },
                  { label: 'Loyalty Points', value: selectedCustomer.loyaltyPoints.toLocaleString() },
                  { label: 'Referrals', value: selectedCustomer.referrals.toString() },
                  { label: 'Risk Score', value: `${selectedCustomer.riskScore}/100` },
                  { label: 'Location', value: `${selectedCustomer.city}, ${selectedCustomer.country}` },
                  { label: 'Member Since', value: formatDate(selectedCustomer.joinDate) },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCustomer(null)}>Close</button>
              <button className="btn btn-primary">Edit Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
