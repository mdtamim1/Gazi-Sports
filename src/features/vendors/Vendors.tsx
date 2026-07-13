import { useState } from 'react';
import { Store, UserCheck, UserX, AlertTriangle, Search, Filter, Mail, DollarSign, Star, ExternalLink, RefreshCw } from 'lucide-react';
import { generateVendors, formatCurrency, formatDate } from '../../mock/data';

const statusConfig: Record<string, string> = {
  active: 'badge-success',
  pending: 'badge-warning',
  suspended: 'badge-danger',
  rejected: 'badge-purple',
};

export default function Vendors() {
  const [vendors] = useState(generateVendors(30));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = vendors.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingApproval = vendors.filter(v => v.status === 'pending').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Vendors</span></div>
          <h1 className="page-title">Vendor Control Center</h1>
          <p className="page-subtitle">Manage multi-vendor marketplace, approvals, and payouts</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary"><RefreshCw size={16} /> Process Payouts</button>
        </div>
      </div>

      {/* Vendor Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Vendors', value: vendors.length.toString(), icon: Store, color: 'primary' },
          { label: 'Pending Approval', value: pendingApproval.toString(), icon: UserCheck, color: 'warning' },
          { label: 'Total Vendor Sales', value: formatCurrency(vendors.reduce((acc, v) => acc + v.totalSales, 0)), icon: DollarSign, color: 'success' },
          { label: 'Suspended Accounts', value: vendors.filter(v => v.status === 'suspended').length.toString(), icon: AlertTriangle, color: 'danger' },
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

      {/* Pending Approvals Section (if any) */}
      {pendingApproval > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-warning)' }}>
          <div className="card-header" style={{ paddingBottom: 'var(--space-4)' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--color-warning)" /> Action Required: Vendor Approvals
              </div>
              <div className="card-subtitle">Review new vendor applications before they can start selling</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {vendors.filter(v => v.status === 'pending').slice(0, 3).map((vendor, i) => (
              <div key={vendor.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border-secondary)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Store size={20} color="var(--text-secondary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{vendor.company}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{vendor.name} • {vendor.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-success btn-sm">Approve</button>
                  <button className="btn btn-danger btn-sm">Reject</button>
                  <button className="btn btn-ghost btn-sm">Review Docs</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Table */}
      <div className="data-table-container">
        <div className="data-table-header">
          <div className="data-table-title">Marketplace Vendors</div>
          <div className="data-table-actions">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ height: '34px', paddingLeft: '32px', width: '220px', fontSize: 'var(--text-xs)' }}
                placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ height: '34px', width: '130px', fontSize: 'var(--text-xs)' }}
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Vendor Details</th>
              <th>Status</th>
              <th>Products</th>
              <th>Total Sales</th>
              <th>Comm. Rate</th>
              <th>Rating</th>
              <th>Payout Due</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((vendor) => (
              <tr key={vendor.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vendor.company}</span>
                        {vendor.verified && <CheckCircle size={14} color="var(--color-info)" />}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{vendor.name}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`badge ${statusConfig[vendor.status]}`}>{vendor.status}</span></td>
                <td>{vendor.products}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(vendor.totalSales)}</td>
                <td>{vendor.commission}%</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={12} fill="var(--color-warning)" color="var(--color-warning)" />
                    <span style={{ fontWeight: 600 }}>{vendor.rating.toFixed(1)}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: vendor.payoutDue > 0 ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
                  {formatCurrency(vendor.payoutDue)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" title="Contact"><Mail size={14} /></button>
                    {vendor.status === 'active' ? (
                      <button className="btn btn-ghost btn-sm" title="Suspend" style={{ color: 'var(--color-danger)' }}><UserX size={14} /></button>
                    ) : vendor.status === 'suspended' ? (
                      <button className="btn btn-ghost btn-sm" title="Reactivate" style={{ color: 'var(--color-success)' }}><UserCheck size={14} /></button>
                    ) : null}
                    <button className="btn btn-ghost btn-sm" title="View Dashboard"><ExternalLink size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
