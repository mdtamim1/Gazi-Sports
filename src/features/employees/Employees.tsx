import { useState, useEffect } from 'react';
import { UserCog, Shield, Plus, Edit, Trash2, X, Mail, Check, AlertCircle, Copy, Link, Power } from 'lucide-react';
import { 
  fetchEmployees, 
  updateEmployee, 
  deleteEmployee, 
  fetchRoles, 
  createRole, 
  updateRole, 
  deleteRole, 
  fetchInvitations, 
  inviteEmployee, 
  deleteInvitation,
  toggleEmployeeStatusInBackend 
} from '../../services/api';

const roleColors: Record<string, string> = {
  'Super Admin': 'badge-purple',
  'Admin': 'badge-primary',
  'Moderator': 'badge-info',
};

const statusColors: Record<string, string> = {
  active: 'status-dot online',
  inactive: 'status-dot offline',
  suspended: 'status-dot busy',
};

const availableModules = [
  { id: 'dashboard', name: 'Dashboard Overview' },
  { id: 'analytics', name: 'Advanced Analytics' },
  { id: 'orders', name: 'Order Processing' },
  { id: 'products', name: 'Product Control Center' },
  { id: 'storefront', name: 'Storefront manager' },
  { id: 'chats', name: 'Inbox (Chats)' },
  { id: 'marketing', name: 'Marketing Campaigns' },
  { id: 'employees', name: 'Employee Management' },
  { id: 'finance', name: 'Financial Overview' },
  { id: 'security', name: 'Security Center' },
  { id: 'settings', name: 'System Settings' },
  { id: 'ai', name: 'AI Center' }
];

export default function Employees() {
  const [activeTab, setActiveTab] = useState('directory');
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  // Invite Form States
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<number | string>('');
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  // Role Form States
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [roleError, setRoleError] = useState('');

  const tabs = [
    { id: 'directory', label: 'Employee Directory', icon: UserCog },
    { id: 'roles', label: 'Roles Matrix Setup', icon: Shield },
    { id: 'invitations', label: 'Invitations log', icon: Mail },
  ];

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [empData, roleData, inviteData] = await Promise.all([
        fetchEmployees(),
        fetchRoles(),
        fetchInvitations()
      ]);

      if (empData) setEmployees(empData);
      if (roleData) {
        setRoles(roleData);
        if (roleData.length > 0 && !inviteRoleId) {
          // Select first role as default in select dropdown
          const firstNonSuper = roleData.find((r: any) => r.name !== 'Super Admin') || roleData[0];
          setInviteRoleId(firstNonSuper.id);
        }
      }
      if (inviteData) setInvitations(inviteData);
    } catch (e) {
      setErrorMsg('সার্ভার থেকে ডাটা লোড করা যাচ্ছে না।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Invite Form Submission
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccessMsg('');
    setGeneratedLink('');

    if (!inviteEmail.trim() || !inviteRoleId) {
      setInviteError('ইমেইল এবং রোল সিলেক্ট করুন।');
      return;
    }

    const res = await inviteEmployee({
      email: inviteEmail.trim().toLowerCase(),
      role_id: Number(inviteRoleId)
    });

    if (res.status === 'success') {
      const link = `${window.location.protocol}//${window.location.host}/register-employee?token=${res.data.token}`;
      setGeneratedLink(link);
      setInviteSuccessMsg('ইনভাইটেশন লিংক সফলভাবে তৈরি হয়েছে! নিচের লিংকটি কপি করে ইনভাইট করুন।');
      setInviteEmail('');
      // Reload invitations logs
      const updatedInvites = await fetchInvitations();
      if (updatedInvites) setInvitations(updatedInvites);
    } else {
      setInviteError(res.message || 'ইনভাইটেশন তৈরি করা সম্ভব হয়নি।');
    }
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (id: string) => {
    if (confirm('Are you sure you want to revoke this invitation?')) {
      const res = await deleteInvitation(id);
      if (res.status === 'success') {
        setInvitations(prev => prev.filter(inv => inv.id !== id));
      } else {
        alert(res.message || 'Failed to revoke invitation');
      }
    }
  };

  // Copy registration link to clipboard
  const handleCopyLink = (linkText: string, id: string) => {
    navigator.clipboard.writeText(linkText);
    setCopiedInviteId(id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  // Edit employee status/role/department
  const handleOpenEditEmp = (emp: any) => {
    setEditingEmployee({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role_id: emp.role_id,
      status: emp.status,
      department: emp.department
    });
    setShowEditEmpModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const res = await updateEmployee(editingEmployee.id, {
      role_id: Number(editingEmployee.role_id),
      status: editingEmployee.status,
      department: editingEmployee.department
    });

    if (res.status === 'success') {
      setShowEditEmpModal(false);
      setEditingEmployee(null);
      loadData();
    } else {
      alert(res.message || 'Failed to update employee details');
    }
  };

  // Toggle employee active/inactive status
  const handleToggleStatus = async (emp: any) => {
    const res = await toggleEmployeeStatusInBackend(emp.id);
    if (res.status === 'success') {
      setEmployees(prev => prev.map(e => 
        e.id === emp.id ? { ...e, status: res.data.newStatus } : e
      ));
    } else {
      alert(res.message || 'Failed to toggle employee status');
    }
  };

  // Delete employee
  const handleDeleteEmp = async (emp: any) => {
    if (confirm(`Are you sure you want to delete ${emp.name}?`)) {
      const res = await deleteEmployee(emp.id);
      if (res.status === 'success') {
        setEmployees(prev => prev.filter(e => e.id !== emp.id));
      } else {
        alert(res.message || 'Failed to delete employee');
      }
    }
  };

  // Open Add/Edit custom role
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setRolePerms([]);
    setRoleError('');
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description);
    setRolePerms(role.permissions || []);
    setRoleError('');
    setShowRoleModal(true);
  };

  // Save Role settings
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError('');

    if (!roleName.trim()) {
      setRoleError('রোল টাইটেল দিতে হবে।');
      return;
    }

    if (editingRole) {
      // Update
      const res = await updateRole(editingRole.id, {
        name: roleName.trim(),
        description: roleDesc.trim(),
        permissions: rolePerms
      });
      if (res.status === 'success') {
        setShowRoleModal(false);
        setEditingRole(null);
        loadData();
      } else {
        setRoleError(res.message || 'Failed to update role');
      }
    } else {
      // Create
      const res = await createRole({
        name: roleName.trim(),
        description: roleDesc.trim(),
        permissions: rolePerms
      });
      if (res.status === 'success') {
        setShowRoleModal(false);
        loadData();
      } else {
        setRoleError(res.message || 'Failed to create role');
      }
    }
  };

  // Delete custom role
  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (confirm(`Are you sure you want to delete the custom role: ${roleName}?`)) {
      const res = await deleteRole(roleId);
      if (res.status === 'success') {
        loadData();
      } else {
        alert(res.message || 'Failed to delete role');
      }
    }
  };

  const toggleRolePerm = (modId: string) => {
    setRolePerms(prev => 
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  if (loading && employees.length === 0) {
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
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Employees</span></div>
          <h1 className="page-title">Employee Control Panel</h1>
          <p className="page-subtitle">Manage staff access levels, roles setup, and employee invitations</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleOpenAddRole}><Shield size={16} /> Roles Setup</button>
          <button className="btn btn-primary" onClick={() => setActiveTab('invitations')}><Plus size={16} /> Invite Employee</button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: 'var(--text-xs)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

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

      {/* STAFF DIRECTORY PANEL */}
      {activeTab === 'directory' && (
        <div className="data-table-container">
          <div className="data-table-header">
            <div className="data-table-title">Employee List</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Active/Deactive</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                        {employee.avatar}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${roleColors[employee.role] || 'badge-secondary'}`}>
                      {employee.role}
                    </span>
                  </td>
                  <td>{employee.department}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className={statusColors[employee.status] || 'status-dot offline'} />
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'capitalize' }}>{employee.status}</span>
                    </div>
                  </td>
                  <td>
                    {employee.id === 'EMP-001' ? (
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        <Power size={12} /> Always Active
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(employee)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                          cursor: 'pointer', border: 'none', transition: 'all 0.3s ease',
                          background: employee.status === 'active' 
                            ? 'rgba(16, 185, 129, 0.12)' 
                            : 'rgba(239, 68, 68, 0.12)',
                          color: employee.status === 'active' ? '#10b981' : '#ef4444',
                          boxShadow: employee.status === 'active' 
                            ? '0 0 8px rgba(16, 185, 129, 0.2)' 
                            : '0 0 8px rgba(239, 68, 68, 0.15)',
                        }}
                        title={employee.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}
                      >
                        <div style={{
                          width: '32px', height: '16px', borderRadius: '10px', position: 'relative',
                          background: employee.status === 'active' ? '#10b981' : '#64748b',
                          transition: 'background 0.3s ease',
                        }}>
                          <div style={{
                            width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: '2px',
                            left: employee.status === 'active' ? '18px' : '2px',
                            transition: 'left 0.3s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }} />
                        </div>
                        {employee.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    )}
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>
                    {employee.lastLogin ? new Date(employee.lastLogin).toLocaleString() : 'N/A'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm" title="Edit Employee" onClick={() => handleOpenEditEmp(employee)}><Edit size={14} /></button>
                      {employee.id !== 'EMP-001' && (
                        <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteEmp(employee)}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ROLES MATRIX PANEL */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Roles & Access Toggles</div>
              <button className="btn btn-primary btn-sm" onClick={handleOpenAddRole}><Plus size={14} /> Add Role</button>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Set up administrative access configurations. Edit each role to manage exactly what tabs they can view.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {roles.map((role) => (
                  <div key={role.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{role.name}</h4>
                        {role.is_system && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>System</span>}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', minHeight: '36px' }}>{role.description}</p>
                      
                      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Allowed Modules:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {role.name === 'Super Admin' || role.name === 'Admin' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>All Modules</span>
                          ) : role.permissions.length === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No access granted</span>
                          ) : (
                            role.permissions.map((p: string) => (
                              <span key={p} className="badge badge-info" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>{p}</span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-primary)' }}>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleOpenEditRole(role)}><Edit size={14} /> Permissions Matrix</button>
                      {!role.is_system && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteRole(role.id, role.name)}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVITATIONS LOGS PANEL */}
      {activeTab === 'invitations' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', alignItems: 'start' }}>
          {/* Create Invite Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Create Invitation</div>
            </div>
            <form onSubmit={handleSendInvite}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                  Enter the moderator or admin's email address below to generate a unique registration link associated with their role.
                </p>

                {inviteError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> {inviteError}
                  </div>
                )}

                {inviteSuccessMsg && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#16a34a', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={16} /> {inviteSuccessMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    placeholder="moderator@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Role *</label>
                  <select
                    className="form-select"
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} {r.is_system ? '(Default)' : ''}</option>
                    ))}
                  </select>
                </div>

                {generatedLink && (
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Registration Link:</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={generatedLink}
                        style={{ flex: 1, height: '36px', background: 'transparent', border: '1px solid var(--border-primary)', borderRadius: '4px', padding: '0 8px', fontSize: '0.78rem', color: 'var(--text-primary)' }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ height: '36px', display: 'flex', gap: '4px', alignItems: 'center' }}
                        onClick={() => handleCopyLink(generatedLink, 'invite-form')}
                      >
                        {copiedInviteId === 'invite-form' ? <Check size={14} /> : <Copy size={14} />}
                        {copiedInviteId === 'invite-form' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Generate Invitation</button>
              </div>
            </form>
          </div>

          {/* Invitation Logs Grid */}
          <div className="data-table-container">
            <div className="data-table-header">
              <div className="data-table-title">Sent Invitations</div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invited User</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      কোনো পেন্ডিং আমন্ত্রণপত্র পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  invitations.map((inv) => {
                    const regLink = `${window.location.protocol}//${window.location.host}/register-employee?token=${inv.token}`;
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.email}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Expires: {new Date(inv.expires_at).toLocaleDateString()}</div>
                        </td>
                        <td><span className="badge badge-info">{inv.role}</span></td>
                        <td>
                          <span className={`badge ${inv.status === 'accepted' ? 'badge-success' : 'badge-warning'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {inv.status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Copy Registration Link"
                                  onClick={() => handleCopyLink(regLink, inv.id)}
                                >
                                  {copiedInviteId === inv.id ? <Check size={14} color="var(--color-success)" /> : <Link size={14} />}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Revoke invitation"
                                  style={{ color: 'var(--color-danger)' }}
                                  onClick={() => handleRevokeInvitation(inv.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT ROLE PERMISSIONS MATRIX MODAL */}
      {showRoleModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <span className="modal-title">{editingRole ? 'Edit Access Matrix' : 'Create Custom Role'}</span>
              <button onClick={() => setShowRoleModal(false)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {roleError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> {roleError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Role Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Moderator"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    disabled={editingRole?.is_system}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief details about what this role does"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '8px' }}>Module Permissions Access</label>
                  {editingRole?.name === 'Super Admin' || editingRole?.name === 'Admin' ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                      ✓ System admins automatically hold full access to all panels.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-lg)', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-primary)' }}>
                      {availableModules.map(m => {
                        const isChecked = rolePerms.includes(m.id);
                        return (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={isChecked}
                              onChange={() => toggleRolePerm(m.id)}
                            />
                            {m.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Role Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE DETAILS MODAL */}
      {showEditEmpModal && editingEmployee && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <span className="modal-title">Edit Employee Access</span>
              <button onClick={() => setShowEditEmpModal(false)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Employee Name</label>
                  <input
                    type="text"
                    className="form-input"
                    disabled
                    value={editingEmployee.name}
                    style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="text"
                    className="form-input"
                    disabled
                    value={editingEmployee.email}
                    style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editingEmployee.department}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Role Setup</label>
                  <select
                    className="form-select"
                    value={editingEmployee.role_id}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, role_id: e.target.value })}
                    disabled={editingEmployee.id === 'EMP-001'}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status Access</label>
                  <select
                    className="form-select"
                    value={editingEmployee.status}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value })}
                    disabled={editingEmployee.id === 'EMP-001'}
                  >
                    <option value="active">Active (Full access)</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended (Access blocked)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditEmpModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
