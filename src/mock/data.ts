import type { Order, Customer, Product, Vendor, Employee, Campaign, SecurityEvent, ActivityItem, ChartDataPoint } from '../types';

// ---- Helper Functions ----
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(2);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const genId = () => '#' + Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper to read/write from localStorage
const getStoredData = <T>(key: string, defaultVal: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setStoredData = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Ignore
  }
};

// ---- Default Seed Lists ----
const defaultOrders: Order[] = [
  { id: 'ORD-10001', customer: 'John Doe', email: 'john@example.com', amount: 12500, status: 'delivered', items: 2, date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), paymentMethod: 'bkash', productsList: [{ name: 'Sony WH-1000XM5', price: 42000, quantity: 1 }] },
  { id: 'ORD-10002', customer: 'Rahim Ahmed', email: 'rahim@example.com', amount: 8900, status: 'processing', items: 1, date: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), paymentMethod: 'nagad', productsList: [{ name: 'Logitech MX Master 3S', price: 12500, quantity: 1 }] },
  { id: 'ORD-10003', customer: 'Sarah Khan', email: 'sarah@example.com', amount: 24500, status: 'pending', items: 3, date: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), paymentMethod: 'card', productsList: [{ name: 'Keychron K2 V2 Keyboard', price: 9500, quantity: 2 }] },
  { id: 'ORD-10004', customer: 'Farhan Zaman', email: 'farhan@example.com', amount: 1500, status: 'delivered', items: 1, date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), paymentMethod: 'cod', productsList: [{ name: 'Smart LED Bulb', price: 1500, quantity: 1 }] },
  { id: 'ORD-10005', customer: 'Sadia Islam', email: 'sadia@example.com', amount: 6200, status: 'shipped', items: 2, date: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), paymentMethod: 'bkash', productsList: [{ name: 'Keychron K2 V2 Keyboard', price: 9500, quantity: 1 }] }
];

const defaultProducts: Product[] = [
  { id: 'PRD-001', name: 'iPhone 15 Pro Max', sku: 'IPH15PM-256', category: 'Smartphones', brand: 'Apple', price: 165000, stock: 12, sold: 145, revenue: 23925000, rating: 4.8, status: 'active', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-002', name: 'Samsung Galaxy S24 Ultra', sku: 'SAMS24U-512', category: 'Smartphones', brand: 'Samsung', price: 145000, stock: 8, sold: 98, revenue: 14210000, rating: 4.7, status: 'active', image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-003', name: 'MacBook Pro 14" M3', sku: 'MACBPM3-08', category: 'Laptops', brand: 'Apple', price: 210000, stock: 5, sold: 42, revenue: 8820000, rating: 4.9, status: 'active', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-004', name: 'Sony WH-1000XM5', sku: 'SONYXM5-BLK', category: 'Audio', brand: 'Sony', price: 42000, stock: 15, sold: 180, revenue: 7560000, rating: 4.6, status: 'active', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-005', name: 'Apple Watch Ultra 2', sku: 'APWTU2-GPS', category: 'Wearables', brand: 'Apple', price: 95000, stock: 3, sold: 34, revenue: 3230000, rating: 4.8, status: 'active', image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-006', name: 'Bose QuietComfort Headphones', sku: 'BOSEQC-SLV', category: 'Audio', brand: 'Bose', price: 38000, stock: 0, sold: 88, revenue: 3344000, rating: 4.5, status: 'active', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-007', name: 'Dell XPS 13 Plus', sku: 'DELLXPS13-P', category: 'Laptops', brand: 'Dell', price: 185000, stock: 2, sold: 29, revenue: 5365000, rating: 4.4, status: 'pending', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-008', name: 'Keychron K2 V2 Keyboard', sku: 'KEYK2-BROWN', category: 'Accessories', brand: 'Keychron', price: 9500, stock: 45, sold: 230, revenue: 2185000, rating: 4.7, status: 'active', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-009', name: 'Logitech MX Master 3S', sku: 'LOGMX3S-GRY', category: 'Accessories', brand: 'Logitech', price: 12500, stock: 18, sold: 320, revenue: 4000000, rating: 4.8, status: 'active', image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=150&auto=format&fit=crop&q=60' },
  { id: 'PRD-010', name: 'Ergonomic Mesh Chair', sku: 'OFFCHR-ERG', category: 'Furniture', brand: 'Steelcase', price: 32000, stock: 4, sold: 18, revenue: 576000, rating: 4.3, status: 'draft', image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=150&auto=format&fit=crop&q=60' }
];

const defaultEmployees: Employee[] = [
  { id: 'EMP-001', name: 'Super Admin', email: 'admin@vipcommerce.com', role: 'Super Admin', department: 'Management', status: 'active', avatar: 'SA', lastLogin: new Date(Date.now() - 5 * 60 * 1000).toISOString(), permissions: ['all'] },
  { id: 'EMP-002', name: 'Sarah Jenkins', email: 'sarah.j@vipcommerce.com', role: 'Admin', department: 'Operations', status: 'active', avatar: 'SJ', lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(), permissions: ['dashboard', 'analytics', 'orders', 'products', 'customers', 'marketing'] },
  { id: 'EMP-003', name: 'Michael Chang', email: 'm.chang@vipcommerce.com', role: 'Manager', department: 'Finance', status: 'active', avatar: 'MC', lastLogin: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), permissions: ['dashboard', 'finance', 'analytics'] },
  { id: 'EMP-004', name: 'Emily Rodriguez', email: 'emily.r@vipcommerce.com', role: 'Manager', department: 'Marketing', status: 'active', avatar: 'ER', lastLogin: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), permissions: ['dashboard', 'marketing', 'analytics'] },
  { id: 'EMP-005', name: 'David Kim', email: 'david.k@vipcommerce.com', role: 'Staff', department: 'Inventory', status: 'active', avatar: 'DK', lastLogin: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), permissions: ['orders', 'products'] },
  { id: 'EMP-006', name: 'Jessica Taylor', email: 'jessica.t@vipcommerce.com', role: 'Support Agent', department: 'Support', status: 'active', avatar: 'JT', lastLogin: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), permissions: ['customers'] },
  { id: 'EMP-007', name: 'James Wilson', email: 'james.w@vipcommerce.com', role: 'Delivery Agent', department: 'Logistics', status: 'inactive', avatar: 'JW', lastLogin: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), permissions: [] },
  { id: 'EMP-008', name: 'Anna Kovacs', email: 'anna.k@vipcommerce.com', role: 'Staff', department: 'Operations', status: 'suspended', avatar: 'AK', lastLogin: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), permissions: [] }
];

const defaultCampaigns: Campaign[] = [
  { id: 'CMP-001', name: 'Summer Clearance Sale', type: 'email', status: 'active', sent: 12000, opened: 6800, clicked: 2400, converted: 310, revenue: 155000, startDate: '2026-06-01', endDate: '2026-06-30' },
  { id: 'CMP-002', name: 'Tech Launch Push Notification', type: 'push', status: 'active', sent: 25000, opened: 15000, clicked: 4800, converted: 540, revenue: 320000, startDate: '2026-06-15', endDate: '2026-06-22' },
  { id: 'CMP-003', name: 'Father\'s Day Flash Promo', type: 'sms', status: 'completed', sent: 8000, opened: 7800, clicked: 1200, converted: 180, revenue: 78000, startDate: '2026-06-10', endDate: '2026-06-16' },
  { id: 'CMP-004', name: 'New User Welcome Flow', type: 'email', status: 'active', sent: 1500, opened: 1250, clicked: 600, converted: 115, revenue: 45000, startDate: '2026-01-01', endDate: '2026-12-31' },
  { id: 'CMP-005', name: 'Abandoned Cart Recovery SMS', type: 'sms', status: 'active', sent: 450, opened: 440, clicked: 180, converted: 52, revenue: 84000, startDate: '2026-01-01', endDate: '2026-12-31' },
  { id: 'CMP-006', name: 'Weekly Design Newsletter', type: 'email', status: 'draft', sent: 0, opened: 0, clicked: 0, converted: 0, revenue: 0, startDate: '2026-06-25', endDate: '2026-06-25' }
];

const defaultActivities: ActivityItem[] = [
  { id: 'ACT-1', type: 'order', message: '<strong>Rahim Ahmed</strong> placed an order for <span class="activity-amount">৳8,900.00</span>', user: 'Rahim Ahmed', amount: 8900, timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), avatar: 'RA', avatarColor: '#8b5cf6' },
  { id: 'ACT-2', type: 'customer', message: 'New customer <strong>Sarah Khan</strong> registered an account', user: 'Sarah Khan', timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), avatar: 'SK', avatarColor: '#10b981' },
  { id: 'ACT-3', type: 'product', message: 'Product <strong>iPhone 15 Pro Max</strong> stock updated to 12 items', user: 'Sarah Jenkins', timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), avatar: 'SJ', avatarColor: '#6366f1' },
  { id: 'ACT-4', type: 'system', message: 'Daily system database backup completed successfully', user: 'System', timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), avatar: 'SY', avatarColor: '#64748b' }
];

// ---- Revenue Data ----
export const revenueData = {
  total: 543000,
  today: 22900,
  monthly: 495000,
  yearly: 543000,
  netProfit: 162900,
  grossProfit: 271500,
  expenses: 108600,
  todayChange: 12.4,
  monthlyChange: 8.2,
  yearlyChange: 15.6,
  netProfitMargin: 30,
  grossProfitMargin: 50,
};

export const orderList: Order[] = getStoredData('orderList', defaultOrders);
export const activityList: ActivityItem[] = getStoredData('activityList', defaultActivities);

const recalculateStats = () => {
  let total = 0;
  orderList.forEach(o => {
    total += o.amount;
  });
  
  revenueData.total = total;
  revenueData.today = +(total * 0.05).toFixed(2);
  revenueData.monthly = +(total * 0.9).toFixed(2);
  revenueData.yearly = total;
  revenueData.netProfit = +(total * 0.3).toFixed(2);
  revenueData.grossProfit = +(total * 0.5).toFixed(2);
  revenueData.expenses = +(total * 0.2).toFixed(2);
};

// Seeding standard data on load if localStorage is empty
if (!localStorage.getItem('orderList')) {
  setStoredData('orderList', defaultOrders);
}
if (!localStorage.getItem('activityList')) {
  setStoredData('activityList', defaultActivities);
}

// ---- Monthly Revenue Chart ----
export const monthlyRevenueData: ChartDataPoint[] = [
  { name: 'Jan', value: 85000, value2: 25500 },
  { name: 'Feb', value: 92000, value2: 27600 },
  { name: 'Mar', value: 110000, value2: 33000 },
  { name: 'Apr', value: 125000, value2: 37500 },
  { name: 'May', value: 145000, value2: 43500 },
  { name: 'Jun', value: 180000, value2: 54000 }
];

// ---- Daily Revenue (Last 30 days) ----
export const dailyRevenueData: ChartDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  name: `${i + 1} Jun`,
  value: rand(12000, 24000),
  value2: rand(3600, 7200)
}));

// ---- Hourly Sales (Today) ----
export const hourlySalesData: ChartDataPoint[] = [
  { name: '00:00', value: 4 },
  { name: '04:00', value: 1 },
  { name: '08:00', value: 8 },
  { name: '12:00', value: 18 },
  { name: '16:00', value: 24 },
  { name: '20:00', value: 14 }
];

// ---- Category Revenue ----
export const categoryRevenueData: ChartDataPoint[] = [
  { name: 'Smartphones', value: 310000 },
  { name: 'Laptops', value: 210000 },
  { name: 'Audio', value: 80000 },
  { name: 'Wearables', value: 95000 },
  { name: 'Accessories', value: 22000 }
];

// ---- Expense Breakdown ----
export const expenseData: ChartDataPoint[] = [
  { name: 'Server Hosting', value: 14500 },
  { name: 'Google/FB Ads', value: 22000 },
  { name: 'Office Rent', value: 35000 },
  { name: 'Logistics/Delivery', value: 8700 },
  { name: 'Staff Salaries', value: 120000 }
];

// ---- Traffic Sources ----
export const trafficSourceData: ChartDataPoint[] = [
  { name: 'Direct', value: 35 },
  { name: 'Google Search', value: 40 },
  { name: 'Social Media', value: 15 },
  { name: 'Email Campaigns', value: 10 }
];

// ---- Device Distribution ----
export const deviceData: ChartDataPoint[] = [
  { name: 'Mobile', value: 65 },
  { name: 'Desktop', value: 30 },
  { name: 'Tablet', value: 5 }
];

// ---- Country Analytics ----
export const countryData: ChartDataPoint[] = [
  { name: 'Bangladesh', value: 480000, value2: 85 },
  { name: 'United States', value: 45000, value2: 8 },
  { name: 'United Kingdom', value: 12000, value2: 4 },
  { name: 'Others', value: 6000, value2: 3 }
];

// ---- Conversion Funnel ----
export const funnelData: ChartDataPoint[] = [
  { name: 'Sessions', value: 10000 },
  { name: 'Product Views', value: 6500 },
  { name: 'Add to Cart', value: 3200 },
  { name: 'Initiated Checkout', value: 1800 },
  { name: 'Completed Purchase', value: 450 }
];

// ---- Sankey (Dummy) ----
export const customerJourneyData: any[] = [];

// ---- Orders Generator ----
export const generateOrders = (count: number = 50): Order[] => {
  return orderList;
};

export const addOrder = (order: Omit<Order, 'id' | 'date' | 'status'>) => {
  const newOrder: Order = {
    ...order,
    id: `ORD-${String(10000 + orderList.length + 1).padStart(5, '0')}`,
    date: new Date().toISOString(),
    status: 'processing',
  };
  orderList.unshift(newOrder);
  setStoredData('orderList', orderList);

  // Add to activity feed
  const newActivity: ActivityItem = {
    id: `ACT-${activityList.length + 1}`,
    type: 'order',
    message: `<strong>${newOrder.customer}</strong> placed an order for <span class="activity-amount">৳${newOrder.amount.toFixed(2)}</span>`,
    user: newOrder.customer,
    amount: newOrder.amount,
    timestamp: newOrder.date,
    avatar: newOrder.customer.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U',
    avatarColor: '#6366f1',
  };
  activityList.unshift(newActivity);
  setStoredData('activityList', activityList);

  // Recalculate stats
  recalculateStats();
};

export const updateOrderStatus = (orderId: string, status: Order['status']) => {
  const order = orderList.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    setStoredData('orderList', orderList);
    recalculateStats();
  }
};

// ---- Customers ----
export const generateCustomers = (count: number = 50): Customer[] => {
  return [
    { id: 'CST-001', name: 'John Doe', email: 'john@example.com', avatar: 'JD', totalSpent: 24500, orders: 4, segment: 'VIP', loyaltyPoints: 245, riskScore: 5, joinDate: '2026-01-15', lastActive: new Date().toISOString(), ltv: 24500, referrals: 2, city: 'Dhaka', country: 'Bangladesh' },
    { id: 'CST-002', name: 'Rahim Ahmed', email: 'rahim@example.com', avatar: 'RA', totalSpent: 8900, orders: 1, segment: 'New', loyaltyPoints: 89, riskScore: 12, joinDate: '2026-06-17', lastActive: new Date().toISOString(), ltv: 8900, referrals: 0, city: 'Chittagong', country: 'Bangladesh' },
    { id: 'CST-003', name: 'Sarah Khan', email: 'sarah@example.com', avatar: 'SK', totalSpent: 42000, orders: 8, segment: 'VIP', loyaltyPoints: 420, riskScore: 3, joinDate: '2025-09-10', lastActive: new Date().toISOString(), ltv: 42000, referrals: 4, city: 'Sylhet', country: 'Bangladesh' }
  ];
};

// ---- Products State Management ----
let storedProducts = getStoredData('productList', defaultProducts);
if (!localStorage.getItem('productList')) {
  setStoredData('productList', defaultProducts);
}

export const generateProducts = (count: number = 50): Product[] => {
  return getStoredData('productList', storedProducts);
};

export const saveProducts = (products: Product[]) => {
  storedProducts = products;
  setStoredData('productList', products);
};

// ---- Vendors ----
export const generateVendors = (count: number = 30): Vendor[] => {
  return [
    { id: 'VND-001', name: 'TechHub Distributing', email: 'sales@techhub.com', company: 'TechHub Ltd.', status: 'active', verified: true, totalSales: 450000, commission: 8, rating: 4.8, products: 45, joinDate: '2025-01-10', lastPayout: '2026-06-01', payoutDue: 45000 },
    { id: 'VND-002', name: 'FashionCo Sourcing', email: 'supply@fashionco.com', company: 'FashionCo Group', status: 'active', verified: true, totalSales: 120000, commission: 12, rating: 4.5, products: 110, joinDate: '2025-04-15', lastPayout: '2026-05-28', payoutDue: 12500 },
    { id: 'VND-003', name: 'HomeStyle Importers', email: 'info@homestyle.com', company: 'HomeStyle Inc.', status: 'active', verified: false, totalSales: 84000, commission: 10, rating: 4.2, products: 28, joinDate: '2025-08-01', lastPayout: '2026-06-05', payoutDue: 8400 },
    { id: 'VND-004', name: 'GadgetWorld BD', email: 'orders@gadgetworld.com', company: 'Gadget World', status: 'pending', verified: false, totalSales: 0, commission: 10, rating: 0, products: 12, joinDate: '2026-06-10', lastPayout: 'N/A', payoutDue: 19200 }
  ];
};

// ---- Employees State Management ----
let storedEmployees = getStoredData('employeeList', defaultEmployees);
if (!localStorage.getItem('employeeList')) {
  setStoredData('employeeList', defaultEmployees);
}

export const generateEmployees = (count: number = 20): Employee[] => {
  return getStoredData('employeeList', storedEmployees);
};

export const saveEmployees = (employees: Employee[]) => {
  storedEmployees = employees;
  setStoredData('employeeList', employees);
};

// ---- Campaigns State Management ----
let storedCampaigns = getStoredData('campaignList', defaultCampaigns);
if (!localStorage.getItem('campaignList')) {
  setStoredData('campaignList', defaultCampaigns);
}

export const generateCampaigns = (count: number = 15): Campaign[] => {
  return getStoredData('campaignList', storedCampaigns);
};

export const saveCampaigns = (campaigns: Campaign[]) => {
  storedCampaigns = campaigns;
  setStoredData('campaignList', campaigns);
};

// ---- Security Events ----
export const generateSecurityEvents = (count: number = 40): SecurityEvent[] => {
  return [
    { id: 'SEC-001', type: 'login', user: 'admin@vipcommerce.com', ip: '192.168.1.1', device: 'Chrome / Windows', location: 'Dhaka, Bangladesh', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), severity: 'low', details: 'Successful administrator login' },
    { id: 'SEC-002', type: 'permission_change', user: 'admin@vipcommerce.com', ip: '192.168.1.1', device: 'Chrome / Windows', location: 'Dhaka, Bangladesh', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), severity: 'medium', details: 'Assigned "Manager" role to Michael Chang' }
  ];
};

// ---- Activity Feed ----
export const generateActivityFeed = (count: number = 20): ActivityItem[] => {
  return getStoredData('activityList', activityList);
};

// ---- Sales Analytics ----
export const salesByHour: ChartDataPoint[] = hourlySalesData;
export const salesByWeekday: ChartDataPoint[] = [
  { name: 'Sat', value: 45000, value2: 12 },
  { name: 'Sun', value: 38000, value2: 9 },
  { name: 'Mon', value: 52000, value2: 15 },
  { name: 'Tue', value: 68000, value2: 21 },
  { name: 'Wed', value: 72000, value2: 24 },
  { name: 'Thu', value: 61000, value2: 18 },
  { name: 'Fri', value: 95000, value2: 32 }
];

// ---- Brand Analytics ----
export const brandPerformance: ChartDataPoint[] = [
  { name: 'Apple', value: 470000 },
  { name: 'Samsung', value: 145000 },
  { name: 'Sony', value: 80000 },
  { name: 'Bose', value: 38000 },
  { name: 'Keychron', value: 22000 }
];

// ---- AI Predictions ----
export const aiSalesPrediction: ChartDataPoint[] = [
  { name: 'Jul', value: 210000 },
  { name: 'Aug', value: 235000 },
  { name: 'Sep', value: 260000 }
];

export const aiCustomerSegments = [
  { name: 'VIP Buyers', segment: 'VIP Buyers', count: 185, growth: '+12.4%', ltv: 35000, value: 12.5, color: '#6366f1' },
  { name: 'Snoozing VIPs', segment: 'Snoozing VIPs', count: 42, growth: '-3.1%', ltv: 28000, value: 3.5, color: '#f59e0b' },
  { name: 'One-time Shoppers', segment: 'One-time Shoppers', count: 1250, growth: '+28.5%', ltv: 4500, value: 84.0, color: '#10b981' }
];

export const aiFraudAlerts = [
  { id: '1', orderId: 'ORD-10023', order: 'ORD-10023', score: 92, risk: 92, status: 'high_risk', type: 'High Risk', customer: 'Fraud Suspect', details: 'Billing country does not match card issuer country', amount: 42000 },
  { id: '2', orderId: 'ORD-10029', order: 'ORD-10029', score: 78, risk: 78, status: 'medium_risk', type: 'Medium Risk', customer: 'Guest User', details: 'Rapid consecutive high-value transactions', amount: 15500 }
];

// ---- Real-time Visitors ----
export const generateVisitorData = () => ({
  current: 142,
  peak: 384,
  avgSessionDuration: '4m 32s',
  bounceRate: 38.4,
  pagesPerSession: 3.8,
  topPages: [],
});

// ---- System Settings ----
export const systemSettings = {
  siteName: 'VIP Commerce Control Center',
  siteUrl: 'https://admin.vipcommerce.com',
  timezone: 'Asia/Dhaka (GMT+6)',
  currency: 'BDT (৳)',
  language: 'English',
  maintenanceMode: false,
  emailProvider: 'SendGrid',
  smtpHost: 'smtp.sendgrid.net',
  smtpPort: 587,
  paymentGateways: ['SSLCommerz', 'bKash API', 'Nagad API', 'Cash on Delivery'],
  shippingProviders: ['Pathao Delivery', 'Steadfast Courier', 'RedX Logistics'],
  cacheDriver: 'Redis',
  cacheHitRate: 94.2,
  cacheSize: '2.4 GB',
  lastBackup: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  backupSize: '1.85 GB',
  apiVersion: '2.4.0-stable',
  totalApiKeys: 12,
  activeApiKeys: 8,
};

// Format helpers
export const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) return `৳${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `৳${(value / 1_000).toFixed(1)}K`;
  return `৳${value.toFixed(2)}`;
};

export const formatNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTime = (dateStr: string): string => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (dateStr: string): string => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
