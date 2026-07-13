import { useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, FileText, Download, PieChart as PieIcon,
  ArrowUpRight, ArrowDownRight, Calculator, Receipt, Wallet, CreditCard, X, Printer, Plus
} from 'lucide-react';
import RunRateCalculator from './RunRateCalculator';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { revenueData, monthlyRevenueData, formatCurrency, formatDate } from '../../mock/data';

const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 19, 41, 0.95)', border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '8px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color, fontSize: '13px', fontWeight: 600 }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 100 ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

const payoutStatusColors: Record<string, string> = {
  completed: 'badge-success',
  pending: 'badge-warning',
  scheduled: 'badge-info',
  failed: 'badge-danger',
};

export default function Finance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  // Dynamic lists states
  const [taxReports, setTaxReports] = useState([
    { period: 'Q1 2026', revenue: 125000, taxable: 110000, taxCollected: 16500, taxRate: 15, status: 'Pending' },
    { period: 'Q4 2025', revenue: 145000, taxable: 130000, taxCollected: 19500, taxRate: 15, status: 'Filed' },
    { period: 'Q3 2025', revenue: 110000, taxable: 95000, taxCollected: 14250, taxRate: 15, status: 'Filed' },
    { period: 'Q2 2025', revenue: 95000, taxable: 82000, taxCollected: 12300, taxRate: 15, status: 'Filed' }
  ]);

  const [vendorPayouts, setVendorPayouts] = useState([
    { id: 'PAY-01', vendor: 'TechHub Distributing', amount: 45000, status: 'pending', date: '2026-06-20' },
    { id: 'PAY-02', vendor: 'FashionCo Sourcing', amount: 12500, status: 'scheduled', date: '2026-06-25' },
    { id: 'PAY-03', vendor: 'HomeStyle Importers', amount: 8400, status: 'completed', date: '2026-06-05' },
    { id: 'PAY-04', vendor: 'GadgetWorld BD', amount: 19200, status: 'pending', date: '2026-06-22' },
  ]);

  const [expenses, setExpenses] = useState([
    { id: 'EXP-01', name: 'Server Hosting (Redis/AWS)', category: 'Infrastructure', amount: 14500, date: '2026-06-01' },
    { id: 'EXP-02', name: 'Google Search Ads', category: 'Marketing', amount: 22000, date: '2026-06-05' },
    { id: 'EXP-03', name: 'Office Rent & Utilities', category: 'Overhead', amount: 35000, date: '2026-06-01' },
    { id: 'EXP-04', name: 'Logistics/Delivery Pathao API', category: 'Operations', amount: 8700, date: '2026-06-12' },
    { id: 'EXP-05', name: 'Staff Salaries (June)', category: 'Payroll', amount: 120000, date: '2026-06-01' },
  ]);

  // Form states (Add Expense)
  const [expName, setExpName] = useState('');
  const [expCat, setExpCat] = useState('Operations');
  const [expAmt, setExpAmt] = useState(0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieIcon },
    { id: 'tax', label: 'Tax Reports', icon: FileText },
    { id: 'payouts', label: 'Vendor Payouts', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'runrate', label: 'Run Rate Calculator', icon: Calculator },
  ];

  // Dynamic profit computations
  const totalRevenueVal = revenueData.total || 543000;
  const totalExpensesVal = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfitVal = totalRevenueVal - totalExpensesVal;
  const totalPayoutsVal = vendorPayouts.reduce((acc, pay) => acc + (pay.status === 'completed' ? pay.amount : 0), 0);

  const profitData = monthlyRevenueData.map(d => ({
    name: d.name,
    revenue: d.value,
    profit: d.value2,
    expenses: (d.value || 0) - (d.value2 || 0),
  }));

  // Re-map expense distribution chart based on expense state
  const expenseChartData = expenses.reduce((acc: any[], current) => {
    const existing = acc.find(item => item.name === current.category);
    if (existing) {
      existing.value += current.amount;
    } else {
      acc.push({ name: current.category, value: current.amount });
    }
    return acc;
  }, []);

  // Tax filing action
  const handleFileTax = (period: string) => {
    setTaxReports(prev => prev.map(t => t.period === period ? { ...t, status: 'Filed' } : t));
    alert(`Tax report filed successfully for ${period}! A submission confirmation has been recorded.`);
  };

  // Payout actions
  const handleProcessPayout = (payoutId: string) => {
    const payout = vendorPayouts.find(p => p.id === payoutId);
    if (!payout) return;

    setVendorPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'completed' as const } : p));
    setActiveReceipt({
      ...payout,
      status: 'completed',
      receiptNo: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      processedAt: new Date().toLocaleString()
    });
  };

  // Add Expense actions
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName || expAmt <= 0) return;

    const newExp = {
      id: `EXP-${String(expenses.length + 1).padStart(2, '0')}`,
      name: expName,
      category: expCat,
      amount: expAmt,
      date: new Date().toISOString().split('T')[0]
    };

    setExpenses([newExp, ...expenses]);
    setExpName('');
    setExpAmt(0);
    setShowExpenseModal(false);
  };

  const handleExportFinanceReports = () => {
    const csvLines = [];
    const reportDate = new Date().toLocaleString();
    
    csvLines.push(`"Gazi Sports - Financial Report Summary"`);
    csvLines.push(`"Generated on:","${reportDate}"`);
    csvLines.push(``);
    
    // Summary
    csvLines.push(`"FINANCIAL KPI SUMMARY"`);
    csvLines.push(`"KPI","Value"`);
    csvLines.push(`"Total Revenue","৳${totalRevenueVal}"`);
    csvLines.push(`"Total Expenses","৳${totalExpensesVal}"`);
    csvLines.push(`"Net Profit","৳${netProfitVal}"`);
    csvLines.push(`"Vendor Payouts Paid","৳${totalPayoutsVal}"`);
    csvLines.push(``);

    // Expenses List
    csvLines.push(`"EXPENSES DETAIL"`);
    csvLines.push(`"Expense ID","Name","Category","Amount (৳)","Date"`);
    expenses.forEach(e => {
      csvLines.push(`"${e.id}","${e.name.replace(/"/g, '""')}","${e.category}",${e.amount},"${e.date}"`);
    });
    csvLines.push(``);

    // Tax reports
    csvLines.push(`"TAX FILINGS"`);
    csvLines.push(`"Period","Revenue (৳)","Taxable Income (৳)","Tax Collected (৳)","Tax Rate (%)","Status"`);
    taxReports.forEach(t => {
      csvLines.push(`"${t.period}",${t.revenue},${t.taxable},${t.taxCollected},${t.taxRate},"${t.status}"`);
    });
    csvLines.push(``);

    // Vendor payouts
    csvLines.push(`"VENDOR PAYOUTS"`);
    csvLines.push(`"Payout ID","Vendor","Amount (৳)","Status","Date"`);
    vendorPayouts.forEach(v => {
      csvLines.push(`"${v.id}","${v.vendor.replace(/"/g, '""')}",${v.amount},"${v.status}","${v.date}"`);
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePL = () => {
    const csvLines = [];
    const reportDate = new Date().toLocaleString();
    
    csvLines.push(`"Gazi Sports - Profit & Loss (P&L) Statement"`);
    csvLines.push(`"Generated on:","${reportDate}"`);
    csvLines.push(``);
    
    csvLines.push(`"REVENUE"`);
    csvLines.push(`"Gross Sales","৳${totalRevenueVal}"`);
    csvLines.push(`"Total Revenue","৳${totalRevenueVal}"`);
    csvLines.push(``);

    csvLines.push(`"EXPENSES (OPERATING COSTS)"`);
    expenseChartData.forEach((row: any) => {
      csvLines.push(`"${row.name}","৳${row.value}"`);
    });
    csvLines.push(`"Total Operating Expenses","৳${totalExpensesVal}"`);
    csvLines.push(``);

    csvLines.push(`"NET INCOME / PROFIT"`);
    csvLines.push(`"Net Profit","৳${netProfitVal}"`);
    csvLines.push(`"Net Profit Margin","${((netProfitVal / totalRevenueVal) * 100).toFixed(2)}%"`);

    const csvContent = csvLines.join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `profit_loss_sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Finance</span></div>
          <h1 className="page-title">Financial Management</h1>
          <p className="page-subtitle">Revenue reports, tax filing, vendor payouts, and P&L tracking</p>
        </div>
        <div className="page-header-actions">
          {activeTab === 'expenses' ? (
            <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}><Plus size={16} /> Add Expense</button>
          ) : activeTab === 'runrate' ? (
            <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> Print Projections</button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={handleExportFinanceReports}>
                <Download size={16} /> Export Reports
              </button>
              <button className="btn btn-primary" onClick={handleGeneratePL}>
                <FileText size={16} /> Generate P&L
              </button>
            </>
          )}
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenueVal), change: 12.4, icon: DollarSign, color: 'primary' },
          { label: 'Net Profit', value: formatCurrency(netProfitVal), change: 8.2, icon: TrendingUp, color: 'success' },
          { label: 'Total Expenses', value: formatCurrency(totalExpensesVal), change: -4.5, icon: CreditCard, color: 'warning' },
          { label: 'Vendor Payouts Paid', value: formatCurrency(totalPayoutsVal), change: 14.2, icon: Wallet, color: 'info' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stat-card-header">
                <div className={`stat-card-icon ${s.color}`}><Icon size={20} /></div>
                <div className={`stat-card-change ${s.change >= 0 ? 'positive' : 'negative'}`}>
                  {s.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(s.change)}%
                </div>
              </div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="content-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Profit & Loss Statement</div>
                <div className="chart-subtitle">Revenue vs Profit vs Expenses</div></div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${(v / 1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Expense Distribution</div></div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                    {expenseChartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {expenseChartData.map((item, i) => (
                  <div key={i} className="chart-legend-item"><div className="chart-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />{item.name}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Commission Summary */}
          <div className="chart-card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="chart-header">
              <div><div className="chart-title">Commission Summary</div></div>
            </div>
            <div className="grid-4" style={{ padding: '0 var(--space-2)' }}>
              {[
                { label: 'Total Commissions Earned', value: '৳54,300.00', color: 'var(--accent-primary)' },
                { label: 'Avg Commission Rate', value: '10.0%', color: 'var(--color-info)' },
                { label: 'Pending Commissions', value: '৳8,900.00', color: 'var(--color-warning)' },
                { label: 'Paid Out This Month', value: '৳45,400.00', color: 'var(--color-success)' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'tax' && (
        <div className="data-table-container">
          <div className="data-table-header">
            <div className="data-table-title">Quarterly Tax Reports</div>
            <div className="data-table-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => alert('Downloading all statement packets...')}>
                <Download size={14} /> Download All
              </button>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Total Revenue</th>
                <th>Taxable Amount</th>
                <th>Tax Collected</th>
                <th>Tax Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxReports.map((report, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{report.period}</td>
                  <td>{formatCurrency(report.revenue)}</td>
                  <td>{formatCurrency(report.taxable)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(report.taxCollected)}</td>
                  <td>{report.taxRate}%</td>
                  <td>
                    <span className={`badge ${report.status === 'Filed' ? 'badge-success' : 'badge-warning'}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>
                    {report.status === 'Pending' ? (
                      <button className="btn btn-success btn-sm" onClick={() => handleFileTax(report.period)}>File Return</button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => alert(`Showing details for filed tax ${report.period}...`)}><FileText size={14} /> View Receipts</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="data-table-container">
          <div className="data-table-header">
            <div className="data-table-title">Vendor Payout Schedule</div>
            <div className="data-table-actions">
              <button className="btn btn-primary btn-sm" onClick={() => {
                const list = vendorPayouts.map(p => ({ ...p, status: 'completed' as const }));
                setVendorPayouts(list);
                alert('All pending payouts processed successfully!');
              }}>
                <DollarSign size={14} /> Process All Pending
              </button>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Payout Amount</th>
                <th>Status</th>
                <th>Scheduled Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendorPayouts.map((payout, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{payout.vendor}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(payout.amount)}</td>
                  <td><span className={`badge ${payoutStatusColors[payout.status]}`}>{payout.status}</span></td>
                  <td>{payout.date}</td>
                  <td>
                    {payout.status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => handleProcessPayout(payout.id)}>Process Payout</button>}
                    {payout.status === 'scheduled' && <button className="btn btn-secondary btn-sm" onClick={() => alert('Rescheduling payout...')}>Reschedule</button>}
                    {payout.status === 'completed' && <button className="btn btn-ghost btn-sm" onClick={() => setActiveReceipt(payout)}><FileText size={14} /> View Invoice</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="data-table-container">
          <div className="data-table-header">
            <div className="data-table-title">Operating Expenditures Ledger</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Log Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.name}</td>
                  <td><span className="badge badge-primary">{e.category}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{formatCurrency(e.amount)}</td>
                  <td>{formatDate(e.date)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => {
                      if (confirm(`Remove expense ${e.name}?`)) setExpenses(expenses.filter(item => item.id !== e.id));
                    }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'runrate' && (
        <RunRateCalculator />
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">Record Operating Expense</span>
              <button onClick={() => setShowExpenseModal(false)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Expense Name / Vendor</label>
                  <input type="text" className="form-input" required value={expName} onChange={e => setExpName(e.target.value)} placeholder="e.g. AWS Cloud Hosting Billing" />
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Category</label>
                  <select className="form-select" value={expCat} onChange={e => setExpCat(e.target.value)}>
                    <option value="Infrastructure">Infrastructure (Hosting, server)</option>
                    <option value="Marketing">Marketing & Advertising</option>
                    <option value="Overhead">Overhead & Office costs</option>
                    <option value="Operations">Operations / Delivery API</option>
                    <option value="Payroll">Payroll / Wages</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (৳)</label>
                  <input type="number" className="form-input" required value={expAmt || ''} onChange={e => setExpAmt(Number(e.target.value))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT INVOICE MODAL */}
      {activeReceipt && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <span className="modal-title">Payout Receipt</span>
              <button onClick={() => setActiveReceipt(null)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ background: '#ffffff', color: '#334155', padding: '24px', borderRadius: 'var(--radius-md)' }}>
              {/* Receipt Template */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '16px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>GAZI SPORTS</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Super Admin Financial Payout Receipt</span>
              </div>

              <div className="grid-2" style={{ fontSize: '12px', gap: '8px 16px', marginBottom: '20px' }}>
                <div><strong>Receipt No:</strong> {activeReceipt.receiptNo || 'REC-892312'}</div>
                <div><strong>Date:</strong> {activeReceipt.processedAt || new Date().toLocaleString()}</div>
                <div><strong>Beneficiary:</strong> {activeReceipt.vendor}</div>
                <div><strong>Status:</strong> COMPLETED</div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '12px 0', marginBottom: '20px', textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Disbursed Amount</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>৳{activeReceipt.amount.toLocaleString()}</span>
              </div>

              <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                This is a simulated system-generated receipt.<br/>
                No physical signature required.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={14} /> Print Invoice</button>
              <button className="btn btn-primary" onClick={() => setActiveReceipt(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
