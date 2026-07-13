import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Users,
  Eye, Package, ArrowUpRight, ArrowDownRight, Activity,
  CreditCard, Wallet, PiggyBank, BarChart3, Globe
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  revenueData as mockRevenueData,
  monthlyRevenueData as mockMonthlyRevenueData,
  dailyRevenueData as mockDailyRevenueData,
  hourlySalesData as mockHourlySalesData,
  categoryRevenueData as mockCategoryRevenueData,
  expenseData as mockExpenseData,
  generateActivityFeed,
  formatCurrency,
  formatNumber,
  generateVisitorData,
  timeAgo,
  generateOrders
} from '../../mock/data';
import { fetchDashboardStats } from '../../services/api';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 19, 41, 0.95)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color, fontSize: '13px', fontWeight: 600 }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 1000
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [dbData, setDbData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [revenueTab, setRevenueTab] = useState<'daily' | 'monthly'>('monthly');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      const data = await fetchDashboardStats();
      if (data) {
        setDbData(data);
        setLiveOrders(data.recentOrders || []);
      } else {
        setLiveOrders(generateActivityFeed(8).filter(a => a.type === 'order'));
      }
      setIsLoading(false);
    };
    loadStats();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newFeed = generateActivityFeed(1);
      if (newFeed && newFeed.length > 0 && newFeed[0]) {
        setLiveOrders(prev => [newFeed[0], ...prev.slice(0, 7)]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = dbData ? dbData.stats : null;

  const activities = dbData?.recentActivities || generateActivityFeed(15);
  const visitorData = dbData?.visitorStats || generateVisitorData();

  const monthlyRevenueData = dbData ? dbData.charts.monthlyRevenueData : mockMonthlyRevenueData;
  const dailyRevenueData = dbData ? dbData.charts.dailyRevenueData : mockDailyRevenueData;
  const expenseData = dbData ? dbData.charts.expenseData : mockExpenseData;
  const hourlySalesData = dbData ? dbData.charts.hourlySalesData : mockHourlySalesData;
  const categoryRevenueData = dbData ? dbData.charts.categoryRevenueData : mockCategoryRevenueData;

  const statCards = [
    { 
      label: 'Total Revenue', 
      value: formatCurrency(stats ? stats.totalRevenue : mockRevenueData.total), 
      change: stats ? stats.yearlyChange : mockRevenueData.yearlyChange, 
      icon: DollarSign, 
      color: 'primary', 
      sub: 'All time' 
    },
    { 
      label: "Today's Revenue", 
      value: formatCurrency(stats ? stats.todayRevenue : mockRevenueData.today), 
      change: stats ? stats.todayChange : mockRevenueData.todayChange, 
      icon: CreditCard, 
      color: 'success', 
      sub: 'vs yesterday' 
    },
    { 
      label: 'Monthly Revenue', 
      value: formatCurrency(stats ? stats.monthlyRevenue : mockRevenueData.monthly), 
      change: stats ? stats.monthlyChange : mockRevenueData.monthlyChange, 
      icon: TrendingUp, 
      color: 'info', 
      sub: 'vs last month' 
    },
    { 
      label: 'Yearly Revenue', 
      value: formatCurrency(stats ? stats.yearlyRevenue : mockRevenueData.yearly), 
      change: stats ? stats.yearlyChange : mockRevenueData.yearlyChange, 
      icon: BarChart3, 
      color: 'purple', 
      sub: 'vs last year' 
    },
    { 
      label: 'Net Profit', 
      value: formatCurrency(stats ? stats.netProfit : mockRevenueData.netProfit), 
      change: stats ? stats.netProfitMargin : mockRevenueData.netProfitMargin, 
      icon: PiggyBank, 
      color: 'success', 
      sub: `${stats ? stats.netProfitMargin : mockRevenueData.netProfitMargin}% margin` 
    },
    { 
      label: 'Gross Profit', 
      value: formatCurrency(stats ? stats.grossProfit : mockRevenueData.grossProfit), 
      change: stats ? stats.grossProfitMargin : mockRevenueData.grossProfitMargin, 
      icon: Wallet, 
      color: 'cyan', 
      sub: `${stats ? stats.grossProfitMargin : mockRevenueData.grossProfitMargin}% margin` 
    },
    { 
      label: 'Total Orders', 
      value: String(stats ? stats.totalOrders : generateOrders().length), 
      change: 0.0, 
      icon: ShoppingCart, 
      color: 'warning', 
      sub: 'This year' 
    },
    { 
      label: 'Live Visitors', 
      value: formatNumber(visitorData.current), 
      change: 8.7, 
      icon: Eye, 
      color: 'rose', 
      sub: 'Right now' 
    },
  ];

  const handleExportReport = () => {
    const reportDate = new Date().toLocaleString();
    const csvLines = [];

    // Title
    csvLines.push(`"Gazi Sports - Dashboard Summary Report"`);
    csvLines.push(`"Generated on:","${reportDate}"`);
    csvLines.push(``);

    // Summary Metrics
    csvLines.push(`"SUMMARY METRICS"`);
    csvLines.push(`"Metric","Value","Change"`);

    const revenueVal = stats ? stats.totalRevenue : mockRevenueData.total;
    const todayRevenueVal = stats ? stats.todayRevenue : mockRevenueData.today;
    const monthlyRevenueVal = stats ? stats.monthlyRevenue : mockRevenueData.monthly;
    const yearlyRevenueVal = stats ? stats.yearlyRevenue : mockRevenueData.yearly;
    const netProfitVal = stats ? stats.netProfit : mockRevenueData.netProfit;
    const grossProfitVal = stats ? stats.grossProfit : mockRevenueData.grossProfit;
    const totalOrdersVal = stats ? stats.totalOrders : generateOrders().length;
    const liveVisitorsVal = visitorData.current;

    const netProfitMarg = stats ? stats.netProfitMargin : mockRevenueData.netProfitMargin;
    const grossProfitMarg = stats ? stats.grossProfitMargin : mockRevenueData.grossProfitMargin;

    csvLines.push(`"Total Revenue","৳${revenueVal}","${stats ? stats.yearlyChange : mockRevenueData.yearlyChange}%"`);
    csvLines.push(`"Today's Revenue","৳${todayRevenueVal}","${stats ? stats.todayChange : mockRevenueData.todayChange}%"`);
    csvLines.push(`"Monthly Revenue","৳${monthlyRevenueVal}","${stats ? stats.monthlyChange : mockRevenueData.monthlyChange}%"`);
    csvLines.push(`"Yearly Revenue","৳${yearlyRevenueVal}","${stats ? stats.yearlyChange : mockRevenueData.yearlyChange}%"`);
    csvLines.push(`"Net Profit","৳${netProfitVal}","${netProfitMarg}% margin"`);
    csvLines.push(`"Gross Profit","৳${grossProfitVal}","${grossProfitMarg}% margin"`);
    csvLines.push(`"Total Orders","${totalOrdersVal}","-"`);
    csvLines.push(`"Live Visitors","${liveVisitorsVal}","-"`);
    csvLines.push(``);

    // Monthly Revenue Trend
    csvLines.push(`"MONTHLY REVENUE TREND"`);
    csvLines.push(`"Month","Revenue (৳)","Profit (৳)"`);
    monthlyRevenueData.forEach((row: any) => {
      csvLines.push(`"${row.name}",${row.value},${row.value2}`);
    });
    csvLines.push(``);

    // Daily Revenue Trend
    csvLines.push(`"DAILY REVENUE TREND"`);
    csvLines.push(`"Date","Revenue (৳)","Profit (৳)"`);
    dailyRevenueData.forEach((row: any) => {
      csvLines.push(`"${row.name}",${row.value},${row.value2}`);
    });
    csvLines.push(``);

    // Expenses
    csvLines.push(`"EXPENSE BREAKDOWN"`);
    csvLines.push(`"Category","Amount (৳)"`);
    expenseData.forEach((row: any) => {
      csvLines.push(`"${row.name}",${row.value}`);
    });
    csvLines.push(``);

    // Category distribution
    csvLines.push(`"REVENUE BY CATEGORY"`);
    csvLines.push(`"Category","Revenue (৳)"`);
    categoryRevenueData.forEach((row: any) => {
      csvLines.push(`"${row.name}",${row.value}`);
    });

    // Join all
    const csvContent = csvLines.join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">
            <span>Home</span>
            <span className="page-breadcrumb-sep">/</span>
            <span>Dashboard</span>
          </div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">
            Welcome back! Here's what's happening — {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExportReport}>
            <Activity size={16} />
            Export Report
          </button>
          <Link to="/store" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Globe size={16} />
            View Store
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="stats-grid">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stat-card-header">
                <div className={`stat-card-icon ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <div className={`stat-card-change ${stat.change >= 0 ? 'positive' : 'negative'}`}>
                  {stat.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <div className="stat-card-label">{stat.label}</div>
              <div className="stat-card-value">{stat.value}</div>
              <div className="stat-card-footer">
                <span>{stat.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart + Expense Breakdown */}
      <div className="content-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Revenue Overview</div>
              <div className="chart-subtitle">Revenue vs Profit trends</div>
            </div>
            <div className="chart-tabs">
              <button
                className={`chart-tab ${revenueTab === 'daily' ? 'active' : ''}`}
                onClick={() => setRevenueTab('daily')}
              >
                Daily
              </button>
              <button
                className={`chart-tab ${revenueTab === 'monthly' ? 'active' : ''}`}
                onClick={() => setRevenueTab('monthly')}
              >
                Monthly
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={revenueTab === 'monthly' ? monthlyRevenueData : dailyRevenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${(v/1000)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="value2" name="Profit" stroke="#10b981" strokeWidth={2} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="chart-legend" style={{ justifyContent: 'center', marginTop: '8px' }}>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: '#6366f1' }} />
              Revenue
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: '#10b981' }} />
              Profit
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Expense Breakdown</div>
              <div className="chart-subtitle">Total: {formatCurrency(stats ? (stats.expenses ?? stats.monthlyRevenue * 0.2) : mockRevenueData.expenses)}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
              >
                {expenseData.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {expenseData.map((item: any, i: number) => (
              <div key={i} className="chart-legend-item">
                <div className="chart-legend-dot" style={{ background: CHART_COLORS[i] }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Sales + Category Revenue */}
      <div className="content-grid-equal" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Real-time Sales Monitor
                <span className="live-indicator">
                  <span className="live-dot" />
                  Live
                </span>
              </div>
              <div className="chart-subtitle">Orders per hour today</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hourlySalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="Sales" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Revenue by Category</div>
              <div className="chart-subtitle">Top performing categories</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryRevenueData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
              <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${(v/1000000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Revenue" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {categoryRevenueData.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Feeds */}
      <div className="content-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Live Orders Feed
                <span className="live-indicator">
                  <span className="live-dot" />
                  Live
                </span>
              </div>
              <div className="chart-subtitle">Real-time order stream</div>
            </div>
          </div>
          <div className="activity-feed" style={{ maxHeight: '400px', overflow: 'auto' }}>
            {liveOrders.map((item: any, i: number) => (
              <div key={`${item.id}-${i}`} className="activity-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="activity-avatar" style={{ background: item.avatarColor }}>{item.avatar}</div>
                <div className="activity-content">
                  <div className="activity-text" dangerouslySetInnerHTML={{ __html: item.message }} />
                  <div className="activity-time">{timeAgo(item.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Customer Activity</div>
              <div className="chart-subtitle">Latest platform activity</div>
            </div>
          </div>
          <div className="activity-feed" style={{ maxHeight: '400px', overflow: 'auto' }}>
            {activities.slice(0, 10).map((item: any, i: number) => (
              <div key={item.id} className="activity-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="activity-avatar" style={{ background: item.avatarColor }}>{item.avatar}</div>
                <div className="activity-content">
                  <div className="activity-text" dangerouslySetInnerHTML={{ __html: item.message }} />
                  <div className="activity-time">{timeAgo(item.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visitor Tracking */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Current Visitors</div>
          <div className="stat-card-value" style={{ color: '#10b981' }}>{formatNumber(visitorData.current)}</div>
          <div className="stat-card-footer">Peak: {formatNumber(visitorData.peak)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Session Duration</div>
          <div className="stat-card-value">{visitorData.avgSessionDuration}</div>
          <div className="stat-card-footer">+12% vs last week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Bounce Rate</div>
          <div className="stat-card-value">{visitorData.bounceRate}%</div>
          <div className="stat-card-footer">-3.2% improvement</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Pages / Session</div>
          <div className="stat-card-value">{visitorData.pagesPerSession}</div>
          <div className="stat-card-footer">+0.8 vs last week</div>
        </div>
      </div>
    </div>
  );
}
