export interface StatCard {
  id: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
  color: string;
}

export interface OrderProduct {
  name: string;
  color?: string;
  size?: string;
  code?: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customer: string;
  email: string;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  items: number;
  date: string;
  paymentMethod: string;
  // Detailed fields
  storeName?: string;
  phone?: string;
  address?: string;
  courier?: string;
  city?: string;
  thana?: string;
  area?: string;
  customerNote?: string;
  shopNote?: string;
  paymentType?: string;
  memoNumber?: string;
  deliveryCharge?: number;
  discount?: number;
  paidAmount?: number;
  subtotal?: number;
  productsList?: OrderProduct[];
  updatedAt?: string;
  assigned_to?: string | null;
  assigned_name?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  totalSpent: number;
  orders: number;
  segment: 'VIP' | 'Regular' | 'New' | 'At-Risk' | 'Churned';
  loyaltyPoints: number;
  riskScore: number;
  joinDate: string;
  lastActive: string;
  ltv: number;
  referrals: number;
  city: string;
  country: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  sold: number;
  revenue: number;
  rating: number;
  status: 'active' | 'draft' | 'archived' | 'pending';
  image: string;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'active' | 'pending' | 'suspended' | 'rejected';
  verified: boolean;
  totalSales: number;
  commission: number;
  rating: number;
  products: number;
  joinDate: string;
  lastPayout: string;
  payoutDue: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Manager' | 'Staff' | 'Support Agent' | 'Delivery Agent';
  department: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar: string;
  lastLogin: string;
  permissions: string[];
}

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'social';
  status: 'active' | 'draft' | 'completed' | 'paused';
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  startDate: string;
  endDate: string;
  productId?: string | null;
  productIds?: string[];
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'failed_login' | 'permission_change' | 'suspicious' | 'blocked';
  user: string;
  ip: string;
  device: string;
  location: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  resource: string;
  details: string;
  timestamp: string;
  ip: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
  value3?: number;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'customer' | 'product' | 'vendor' | 'system';
  message: string;
  user: string;
  amount?: number;
  timestamp: string;
  avatar: string;
  avatarColor: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
  badgeType?: 'default' | 'warning' | 'danger' | 'success';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface Permission {
  id: string;
  module: string;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}
