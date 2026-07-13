import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, ShoppingBag, Users, Globe, Monitor,
  MapPin, MousePointer, GitBranch, Navigation, Brain, Sparkles, ShieldAlert
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import {
  monthlyRevenueData, categoryRevenueData, trafficSourceData, deviceData,
  countryData, salesByHour, salesByWeekday, brandPerformance,
  generateCustomers, formatCurrency, formatNumber
} from '../../mock/data';
import { fetchAnalyticsData } from '../../services/api';

const COLORS = ['#000000', '#2d2d2d', '#555555', '#7f7f7f', '#a6a6a6', '#cccccc'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600 }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 100 ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

const analyticsViews = [
  { id: 'sales', label: 'Sales Performance', icon: BarChart3 },
  { id: 'products', label: 'Product Stats', icon: ShoppingBag },
  { id: 'customers', label: 'Customer LTV', icon: Users },
];

export default function Analytics() {
  const [activeView, setActiveView] = useState('sales');
  const [dateRange, setDateRange] = useState('30days');
  const [dbData, setDbData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const res = await fetchAnalyticsData(dateRange);
    if (res) {
      setDbData(res);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  // Combine database values and fallback mock data
  const currentStats = dbData ? dbData.stats : {
    sales: 495000,
    aov: 12375,
    orders: 40,
    refund: '1.2%',
    salesChg: '+12.4%',
    aovChg: '+3.1%',
    ordChg: '+15%',
    positive: true
  };

  const liveRevenueTrend = dbData ? dbData.charts.revenueTrend : monthlyRevenueData;
  const liveSalesByHour = dbData ? dbData.charts.salesByHour : salesByHour;
  const liveSalesByWeekday = dbData ? dbData.charts.salesByWeekday : salesByWeekday;
  const liveCategoryRevenueData = dbData ? dbData.charts.categoryRevenueData || dbData.charts.categoryRevenueDataData : categoryRevenueData;
  const liveBrandPerformance = dbData ? dbData.charts.brandPerformance : brandPerformance;
  const liveCustomerStats = dbData ? dbData.customers : {
    total: 30,
    newThisMonth: 2,
    avgLtv: 25133,
    churnRate: '1.4%'
  };

  const customerRetention = [
    { name: 'Month 1', value: 100 },
    { name: 'Month 2', value: 85 },
    { name: 'Month 3', value: 72 },
    { name: 'Month 4', value: 65 },
    { name: 'Month 5', value: 58 },
    { name: 'Month 6', value: 54 }
  ];

  const radarData = [
    { metric: 'Marketing', value: 85 },
    { metric: 'Sales', value: 90 },
    { metric: 'Support', value: 75 },
    { metric: 'Productivity', value: 80 },
    { metric: 'Logistics', value: 95 }
  ];

  if (loading && !dbData) {
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
          <div className="page-breadcrumb">
            <span>Home</span><span className="page-breadcrumb-sep">/</span><span>Analytics</span>
          </div>
          <h1 className="page-title">Advanced Performance Analytics</h1>
          <p className="page-subtitle">Real-time revenue metrics, order volumes, and traffic summaries</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <select 
            className="form-select" 
            style={{ width: '150px', height: '38px', fontSize: 'var(--text-xs)' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          <button className="btn btn-secondary" onClick={() => loadAnalytics()}>Refresh</button>
        </div>
      </div>

      {/* Analytics Navigation Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
        {analyticsViews.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              className={`tab ${activeView === view.id ? 'active' : ''}`}
              onClick={() => setActiveView(view.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Icon size={14} /> {view.label}
            </button>
          );
        })}
      </div>

      {/* Sales Analytics */}
      {activeView === 'sales' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Total Revenue', value: formatCurrency(currentStats.sales), change: currentStats.salesChg, positive: currentStats.positive },
              { label: 'Avg Order Value', value: formatCurrency(currentStats.aov), change: currentStats.aovChg, positive: currentStats.positive },
              { label: 'Orders placed', value: currentStats.orders.toString(), change: currentStats.ordChg, positive: currentStats.positive },
              { label: 'Refund Rate', value: currentStats.refund, change: '0.0%', positive: true },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value">{s.value}</div>
                <div className="stat-card-footer">
                  <span className={`stat-card-change ${s.positive ? 'positive' : 'negative'}`}>
                    {s.positive ? <TrendingUp size={12} /> : null} {s.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="content-grid-equal" style={{ marginBottom: 'var(--space-6)' }}>
            {/* Revenue trend line */}
            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Revenue Trend Graph</div></div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={liveRevenueTrend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Revenue" stroke="#000000" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Sales by hour */}
            <div className="chart-card">
              <div className="chart-header"><div><div className="chart-title">Sales by Hour (Today)</div></div></div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={liveSalesByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Orders" fill="#000000" radius={[4, 4, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales by Weekday */}
          <div className="chart-card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="chart-header"><div><div className="chart-title">Sales by Day of Week</div></div></div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={liveSalesByWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Revenue" fill="#000000" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="value2" name="Orders" fill="#7f7f7f" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Product Analytics */}
      {activeView === 'products' && (
        <>
          <div className="content-grid-equal" style={{ marginBottom: 'var(--space-6)' }}>
            {/* Revenue by category */}
            <div className="chart-card">
              <div className="chart-header"><div><div className="chart-title">Revenue by Category</div></div></div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={liveCategoryRevenueData} cx="50%" cy="50%" innerRadius={70} outerRadius={115} paddingAngle={3} dataKey="value">
                    {liveCategoryRevenueData.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                {liveCategoryRevenueData.map((item: any, i: number) => (
                  <div key={i} className="chart-legend-item"><div className="chart-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />{item.name}</div>
                ))}
              </div>
            </div>

            {/* Brand performance */}
            <div className="chart-card">
              <div className="chart-header"><div><div className="chart-title">Brand Performance</div></div></div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={liveBrandPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                  <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Revenue" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {liveBrandPerformance.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header"><div><div className="chart-title">Department Radar Overview</div></div></div>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.15)" />
                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
                <Radar name="Score" dataKey="value" stroke="#000000" fill="#000000" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Customer LTV Analytics */}
      {activeView === 'customers' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Total Customers', value: liveCustomerStats.total.toString() },
              { label: 'New Registrations (This Month)', value: liveCustomerStats.newThisMonth.toString() },
              { label: 'Average Customer LTV', value: formatCurrency(liveCustomerStats.avgLtv) },
              { label: 'Customer Churn Rate', value: liveCustomerStats.churnRate },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="content-grid-equal" style={{ marginBottom: 'var(--space-6)' }}>
            {/* Retention curve */}
            <div className="chart-card">
              <div className="chart-header"><div><div className="chart-title">Customer Retention Curve</div></div></div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={customerRetention}>
                  <defs>
                    <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7f7f7f" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7f7f7f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Retention %" stroke="#000000" strokeWidth={2} fill="url(#retGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Loyalty levels */}
            <div className="chart-card">
              <div className="chart-header"><div><div className="chart-title">Customer Segmentation</div></div></div>
              <div style={{ padding: 'var(--space-4)' }}>
                {[
                  { segment: 'VIP Sportspersons', pct: 60, count: '18', color: '#000000' },
                  { segment: 'Regular Fitness Shoppers', pct: 25, count: '8', color: '#555555' },
                  { segment: 'New Signups', pct: 15, count: '4', color: '#a6a6a6' },
                ].map((seg, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{seg.segment}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{seg.count} ({seg.pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: seg.color, width: `${seg.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
