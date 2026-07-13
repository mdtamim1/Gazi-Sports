import { useState } from 'react';
import { Shield, ShieldAlert, Lock, Activity, Eye, AlertCircle, Ban, Search, Download } from 'lucide-react';
import { generateSecurityEvents, timeAgo } from '../../mock/data';

const severityConfig: Record<string, { class: string; icon: any }> = {
  low: { class: 'badge-info', icon: Eye },
  medium: { class: 'badge-warning', icon: AlertCircle },
  high: { class: 'badge-danger', icon: ShieldAlert },
  critical: { class: 'badge-purple', icon: Ban },
};

export default function Security() {
  const [events] = useState(generateSecurityEvents(40));
  const [search, setSearch] = useState('');

  const filteredEvents = events.filter(e => 
    search === '' || e.user.toLowerCase().includes(search.toLowerCase()) || e.ip.includes(search)
  );

  const criticalCount = events.filter(e => e.severity === 'critical' || e.severity === 'high').length;

  const handleExportLogs = () => {
    if (filteredEvents.length === 0) {
      alert('No security logs available to export.');
      return;
    }

    const headers = ['Event ID', 'Severity', 'Event Type', 'User / System', 'IP Address', 'Location', 'Details', 'Time'];
    const rows = filteredEvents.map(e => [
      e.id,
      e.severity.toUpperCase(),
      `"${e.type.replace(/"/g, '""')}"`,
      `"${e.user.replace(/"/g, '""')}"`,
      e.ip,
      `"${e.location.replace(/"/g, '""')}"`,
      `"${(e.details || '').replace(/"/g, '""')}"`,
      `"${e.timestamp}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `security_logs_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Security</span></div>
          <h1 className="page-title">Security Center</h1>
          <p className="page-subtitle">Monitor threats, access logs, and system security</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExportLogs}><Download size={16} /> Export Logs</button>
          <button className="btn btn-primary"><Shield size={16} /> Security Settings</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon success"><Shield size={20} /></div></div>
          <div className="stat-card-label">System Status</div>
          <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>Secure</div>
          <div className="stat-card-footer">Last scan: 10 mins ago</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon danger"><ShieldAlert size={20} /></div></div>
          <div className="stat-card-label">Critical Alerts</div>
          <div className="stat-card-value">{criticalCount}</div>
          <div className="stat-card-footer">Last 24 hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon warning"><Ban size={20} /></div></div>
          <div className="stat-card-label">Blocked IPs</div>
          <div className="stat-card-value">0</div>
          <div className="stat-card-footer">WAF protection active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-icon primary"><Lock size={20} /></div></div>
          <div className="stat-card-label">2FA Adoption</div>
          <div className="stat-card-value">0%</div>
          <div className="stat-card-footer">Staff members</div>
        </div>
      </div>

      <div className="content-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="data-table-container">
          <div className="data-table-header">
            <div className="data-table-title">Security Events Log</div>
            <div className="data-table-actions">
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ height: '34px', paddingLeft: '32px', width: '220px', fontSize: 'var(--text-xs)' }}
                  placeholder="Search user or IP..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Event Type</th>
                <th>User / System</th>
                <th>IP Address</th>
                <th>Location</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.slice(0, 15).map((event) => {
                const SevIcon = severityConfig[event.severity].icon;
                return (
                  <tr key={event.id}>
                    <td>
                      <span className={`badge ${severityConfig[event.severity].class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
                        <SevIcon size={12} /> {event.severity}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{event.type.replace('_', ' ')}</td>
                    <td>{event.user}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{event.ip}</td>
                    <td style={{ fontSize: 'var(--text-xs)' }}>{event.location}</td>
                    <td style={{ fontSize: 'var(--text-xs)' }}>{timeAgo(event.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Active Threats</div></div>
          </div>
          <div className="card-body">
            {events.filter(e => e.severity === 'critical' || e.severity === 'high').slice(0, 5).map((event, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '12px', borderLeft: `3px solid var(--color-${event.severity === 'critical' ? 'purple' : 'danger'})` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{event.details}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(event.timestamp)}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <span>User: {event.user}</span>
                  <span>IP: <span style={{ fontFamily: 'var(--font-mono)' }}>{event.ip}</span></span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm">Block IP</button>
                  <button className="btn btn-secondary btn-sm">Force Logout</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
