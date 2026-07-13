"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const db_1 = __importDefault(require("../config/db"));
const localDateStr = (isoStr) => {
    try {
        const d = new Date(isoStr);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    catch {
        return isoStr.slice(0, 10);
    }
};
const localYearMonth = (isoStr) => {
    try {
        const d = new Date(isoStr);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}`;
    }
    catch {
        return isoStr.slice(0, 7);
    }
};
const localHour = (isoStr) => {
    try {
        const d = new Date(isoStr);
        return d.getHours();
    }
    catch {
        return parseInt(isoStr.slice(11, 13)) || 0;
    }
};
const getDashboardStats = async (req, res) => {
    try {
        // Fetch all orders and customers for calculations
        const ordersSnapshot = await db_1.default.collection('orders').get();
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const customersSnapshot = await db_1.default.collection('customers').get();
        const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const todayStr = localDateStr(new Date().toISOString());
        const yesterdayObj = new Date();
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterdayStr = localDateStr(yesterdayObj.toISOString());
        const thisMonthStr = localYearMonth(new Date().toISOString());
        const lastMonthObj = new Date();
        lastMonthObj.setMonth(lastMonthObj.getMonth() - 1);
        const lastMonthStr = localYearMonth(lastMonthObj.toISOString());
        const thisYearStr = new Date().getFullYear().toString();
        // 1. Fetch Stat Metrics
        const validOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'returned');
        const totalRevenue = validOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const todayRevenue = validOrders
            .filter(o => localDateStr(o.created_at) === todayStr)
            .reduce((sum, o) => sum + (o.amount || 0), 0);
        const monthlyRevenue = validOrders
            .filter(o => localYearMonth(o.created_at) === thisMonthStr)
            .reduce((sum, o) => sum + (o.amount || 0), 0);
        const yearlyRevenue = validOrders
            .filter(o => {
            try {
                return new Date(o.created_at).getFullYear().toString() === thisYearStr;
            }
            catch {
                return o.created_at.slice(0, 4) === thisYearStr;
            }
        })
            .reduce((sum, o) => sum + (o.amount || 0), 0);
        const yesterdayRevenue = validOrders
            .filter(o => localDateStr(o.created_at) === yesterdayStr)
            .reduce((sum, o) => sum + (o.amount || 0), 0);
        const lastMonthRevenue = validOrders
            .filter(o => localYearMonth(o.created_at) === lastMonthStr)
            .reduce((sum, o) => sum + (o.amount || 0), 0);
        const totalOrders = orders.length;
        const totalCustomers = customers.length;
        // Growth rates
        const todayChange = yesterdayRevenue > 0
            ? parseFloat((((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1))
            : 12.4;
        const monthlyChange = lastMonthRevenue > 0
            ? parseFloat((((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
            : 8.2;
        const yearlyChange = 15.6; // default fallback
        // 2. Profit margins
        const netProfit = parseFloat((totalRevenue * 0.3).toFixed(2));
        const grossProfit = parseFloat((totalRevenue * 0.5).toFixed(2));
        // 3. Monthly Revenue Chart (last 6 months)
        const monthlyRevenueData = [];
        for (let i = 5; i >= 0; i--) {
            const dateObj = new Date();
            dateObj.setMonth(dateObj.getMonth() - i);
            const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
            const yearMonth = localYearMonth(dateObj.toISOString());
            const val = validOrders
                .filter(o => localYearMonth(o.created_at) === yearMonth)
                .reduce((sum, o) => sum + (o.amount || 0), 0);
            monthlyRevenueData.push({
                name: monthStr,
                value: val,
                value2: parseFloat((val * 0.3).toFixed(2)) // 30% profit
            });
        }
        // 4. Daily Revenue Chart (last 30 days)
        const dailyRevenueData = [];
        for (let i = 29; i >= 0; i--) {
            const dateObj = new Date();
            dateObj.setDate(dateObj.getDate() - i);
            const dayName = `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: 'short' })}`;
            const dateStr = localDateStr(dateObj.toISOString());
            const val = validOrders
                .filter(o => localDateStr(o.created_at) === dateStr)
                .reduce((sum, o) => sum + (o.amount || 0), 0);
            dailyRevenueData.push({
                name: dayName,
                value: val,
                value2: parseFloat((val * 0.3).toFixed(2))
            });
        }
        // 5. Hourly Sales Chart (today)
        const hourlySalesData = [];
        const hourSlots = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        const slotCounts = { '00:00': 0, '04:00': 0, '08:00': 0, '12:00': 0, '16:00': 0, '20:00': 0 };
        const todayOrders = orders.filter(o => localDateStr(o.created_at) === todayStr);
        todayOrders.forEach(o => {
            const hr = localHour(o.created_at);
            if (hr >= 0 && hr < 4)
                slotCounts['00:00'] += 1;
            else if (hr >= 4 && hr < 8)
                slotCounts['04:00'] += 1;
            else if (hr >= 8 && hr < 12)
                slotCounts['08:00'] += 1;
            else if (hr >= 12 && hr < 16)
                slotCounts['12:00'] += 1;
            else if (hr >= 16 && hr < 20)
                slotCounts['16:00'] += 1;
            else
                slotCounts['20:00'] += 1;
        });
        hourSlots.forEach(slot => {
            hourlySalesData.push({
                name: slot,
                value: slotCounts[slot]
            });
        });
        // 6. Category Revenue
        const productsSnapshot = await db_1.default.collection('products').get();
        const productCategoryMap = {};
        productsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.sku) {
                productCategoryMap[data.sku] = data.category || 'Accessories';
            }
        });
        const categoryRev = {};
        validOrders.forEach(o => {
            const list = o.productsList || [];
            list.forEach((item) => {
                const cat = productCategoryMap[item.code] || 'Accessories';
                categoryRev[cat] = (categoryRev[cat] || 0) + (Number(item.quantity) * Number(item.price));
            });
        });
        const defaultCategories = ['Smartphones', 'Laptops', 'Audio', 'Wearables', 'Accessories'];
        const categoryRevenueData = defaultCategories.map(cat => {
            return {
                name: cat,
                value: categoryRev[cat] || 0
            };
        });
        // 7. Expense Breakdown
        const totalExpenses = monthlyRevenue > 0 ? monthlyRevenue * 0.2 : 188700 * 0.2;
        const expenseData = [
            { name: 'Server Hosting', value: parseFloat((totalExpenses * 0.15).toFixed(2)) || 14500 },
            { name: 'Google/FB Ads', value: parseFloat((totalExpenses * 0.25).toFixed(2)) || 22000 },
            { name: 'Office Rent', value: parseFloat((totalExpenses * 0.20).toFixed(2)) || 35000 },
            { name: 'Logistics/Delivery', value: parseFloat((totalExpenses * 0.10).toFixed(2)) || 8700 },
            { name: 'Staff Salaries', value: parseFloat((totalExpenses * 0.30).toFixed(2)) || 120000 }
        ];
        // 8. Recent Orders Feed
        const recentOrders = orders
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8)
            .map(o => {
            const initials = o.customer.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            const avatarColors = ['#8b5cf6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4'];
            const colorIndex = Math.abs(o.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % avatarColors.length;
            return {
                id: o.id,
                type: 'order',
                message: `<strong>${o.customer}</strong> placed an order for <span class="activity-amount">৳${o.amount.toFixed(2)}</span>`,
                user: o.customer,
                amount: o.amount,
                timestamp: o.created_at,
                avatar: initials,
                avatarColor: avatarColors[colorIndex]
            };
        });
        // 9. Recent activities feed (supplemented with customer registrations)
        const customerActivities = customers
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map(c => {
            const initials = ((c.first_name ? c.first_name[0] : '') + (c.last_name ? c.last_name[0] : '')).toUpperCase() || 'CU';
            return {
                id: c.id,
                type: 'customer',
                message: `New customer <strong>${c.first_name || ''} ${c.last_name || ''}</strong> registered an account`,
                user: `${c.first_name || ''} ${c.last_name || ''}`,
                timestamp: c.created_at || new Date().toISOString(),
                avatar: initials,
                avatarColor: '#10b981'
            };
        });
        const recentActivities = [...recentOrders, ...customerActivities]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 15);
        // 10. Visitor details (simulated dynamic numbers)
        const currentVisitors = Math.floor(1800 + Math.random() * 800);
        const visitorStats = {
            current: currentVisitors,
            peak: 4500,
            avgSessionDuration: '4m 32s',
            bounceRate: 38.5,
            pagesPerSession: 4.2
        };
        res.json({
            status: 'success',
            data: {
                stats: {
                    totalRevenue,
                    todayRevenue,
                    monthlyRevenue,
                    yearlyRevenue,
                    netProfit,
                    grossProfit,
                    totalOrders,
                    totalCustomers,
                    liveVisitors: currentVisitors,
                    todayChange,
                    monthlyChange,
                    yearlyChange
                },
                charts: {
                    monthlyRevenueData,
                    dailyRevenueData,
                    hourlySalesData,
                    categoryRevenueData,
                    expenseData
                },
                recentOrders,
                recentActivities,
                visitorStats
            }
        });
    }
    catch (error) {
        console.error('Failed to aggregate dashboard statistics:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=dashboardController.js.map