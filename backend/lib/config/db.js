"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const seedData_1 = require("./seedData");
// Initialize Firebase Admin SDK
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp();
}
const db = firebase_admin_1.default.firestore();
// Helper to initialize Firestore database with default collections and documents
function initializeDatabase() {
    return db.runTransaction(async (transaction) => {
        // 1. Seed Roles and Super Admin Employee if empty
        const employeesRef = db.collection('employees');
        const employeesSnapshot = await employeesRef.limit(1).get();
        if (employeesSnapshot.empty) {
            console.log('🌱 Seeding roles and super admin employee...');
            const roleId = 'role-super-admin';
            const roleRef = db.collection('roles').doc(roleId);
            roleRef.set({
                name: 'Super Admin',
                description: 'System Administrator',
                is_system: 1,
                created_at: new Date().toISOString()
            });
            // Admin password: admin123
            // bcrypt hash: $2b$10$dT13c2LnpixQIRx7Bx/CtOqFOvNeS00tUBecfTZZ1lxBWXJpyYOHa
            const adminEmployeeId = 'EMP-001';
            db.collection('employees').doc(adminEmployeeId).set({
                role_id: roleId,
                first_name: 'Super',
                last_name: 'Admin',
                email: 'admin@vipcommerce.com',
                password_hash: '$2b$10$dT13c2LnpixQIRx7Bx/CtOqFOvNeS00tUBecfTZZ1lxBWXJpyYOHa',
                status: 'active',
                department: 'Management',
                created_at: new Date().toISOString()
            });
        }
        // 2. Seed default products
        const productsRef = db.collection('products');
        const productsSnapshot = await productsRef.limit(1).get();
        if (productsSnapshot.empty) {
            console.log('🌱 Seeding default products...');
            for (const p of seedData_1.seedProducts) {
                await productsRef.doc(p.id).set({
                    name: p.name,
                    slug: p.slug,
                    sku: p.sku,
                    brand: p.brand,
                    category: p.category,
                    price: p.price,
                    original_price: p.original_price,
                    rating: p.rating,
                    reviews: p.reviews,
                    image: p.image,
                    gallery: p.gallery,
                    in_stock: p.in_stock,
                    published: p.published,
                    description: p.description,
                    stock: p.stock,
                    sold: 0,
                    revenue: 0.0,
                    features: p.features || [],
                    specs: p.specs || [],
                    created_at: new Date().toISOString()
                });
            }
        }
        // 3. Seed default customer accounts and addresses
        const customersRef = db.collection('customers');
        const customersSnapshot = await customersRef.limit(1).get();
        if (customersSnapshot.empty) {
            console.log('🌱 Seeding default customers...');
            // Rahim Islam: rahim123, bcrypt hash: $2b$10$tJ9fFp8LwXp/w7C27Q/VzO9ZtI48H2D57wF2hP20lQ/0N.p3z7.O6
            const cust1Id = 'cust-1';
            await customersRef.doc(cust1Id).set({
                first_name: 'Rahim',
                last_name: 'Islam',
                email: 'rahim@gmail.com',
                password_hash: '$2b$10$tJ9fFp8LwXp/w7C27Q/VzO9ZtI48H2D57wF2hP20lQ/0N.p3z7.O6',
                phone: '01711223344',
                loyalty_points: 150,
                segment: 'Regular',
                status: 'active',
                risk_score: 0,
                total_spent: 219.98,
                order_count: 2,
                last_active_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                addresses: [
                    {
                        id: 'addr-seed-1',
                        label: 'বাসা (Home)',
                        name: 'Rahim Islam',
                        phone: '01711223344',
                        address: 'হাউজ ২৪, রোড ৩, ধানমন্ডি, ঢাকা',
                        isDefault: true
                    },
                    {
                        id: 'addr-seed-2',
                        label: 'অফিস (Office)',
                        name: 'Rahim Islam',
                        phone: '01711223355',
                        address: 'লেভেল ৫, আইটি সেন্টার, কারওয়ান বাজার, ঢাকা',
                        isDefault: false
                    }
                ]
            });
            // Kamrul Hasan: kamrul123
            const cust2Id = 'cust-2';
            await customersRef.doc(cust2Id).set({
                first_name: 'Kamrul',
                last_name: 'Hasan',
                email: 'kamrul@gmail.com',
                password_hash: '$2b$10$tJ9fFp8LwXp/w7C27Q/VzO9ZtI48H2D57wF2hP20lQ/0N.p3z7.O6',
                phone: '01911223344',
                loyalty_points: 80,
                segment: 'New',
                status: 'active',
                risk_score: 0,
                total_spent: 435.99,
                order_count: 1,
                last_active_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                addresses: [
                    {
                        id: 'addr-seed-3',
                        label: 'বাসা (Home)',
                        name: 'Kamrul Hasan',
                        phone: '01911223344',
                        address: 'সেক্টর ৪, রোড ১২, উত্তরা, ঢাকা',
                        isDefault: true
                    }
                ]
            });
        }
        // 4. Seed default orders
        const ordersRef = db.collection('orders');
        const ordersSnapshot = await ordersRef.limit(1).get();
        if (ordersSnapshot.empty) {
            console.log('🌱 Seeding default orders...');
            const mockOrders = [
                {
                    id: 'ORD-54321',
                    customer: 'Rahim Islam',
                    email: 'rahim@gmail.com',
                    amount: 219.98,
                    items: 2,
                    payment_method: 'Cash on Delivery',
                    store_name: 'BEAUTY GLOWRY',
                    phone: '01711223344',
                    address: 'হাউজ ২৪, রোড ৩, ধানমন্ডি, ঢাকা',
                    courier: 'Pathao',
                    city: 'Dhaka',
                    thana: 'Dhanmondi',
                    area: 'Dhanmondi',
                    customer_note: 'Please call before delivery',
                    shop_note: 'Fragile item',
                    payment_type: 'cod',
                    memo_number: 'MEMO-991',
                    delivery_charge: 60,
                    discount: 0,
                    paid_amount: 0,
                    subtotal: 159.98,
                    status: 'delivered',
                    created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
                    productsList: [
                        { name: 'Premium Leather Crossbody Bag', color: 'Brown', size: 'Free Size', code: 'LW-BAG-002', quantity: 1, price: 89.99 },
                        { name: 'Organic Face Serum Collection', color: 'Default', size: 'Free Size', code: 'NG-FS-004', quantity: 2, price: 35.00 }
                    ]
                },
                {
                    id: 'ORD-54322',
                    customer: 'Kamrul Hasan',
                    email: 'kamrul@gmail.com',
                    amount: 435.99,
                    items: 1,
                    payment_method: 'bKash',
                    store_name: 'BEAUTY GLOWRY',
                    phone: '01911223344',
                    address: 'সেক্টর ৪, রোড ১২, উত্তরা, ঢাকা',
                    courier: 'Steadfast',
                    city: 'Dhaka',
                    thana: 'Uttara',
                    area: 'Uttara',
                    customer_note: '',
                    shop_note: '',
                    payment_type: 'prepaid',
                    memo_number: 'MEMO-992',
                    delivery_charge: 60,
                    discount: 20,
                    paid_amount: 435.99,
                    subtotal: 375.99,
                    status: 'delivered',
                    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
                    productsList: [
                        { name: 'Smart Watch Ultra Series 5', color: 'Titanium', size: '49mm', code: 'TG-SW-005', quantity: 1, price: 395.99 }
                    ]
                }
            ];
            for (const order of mockOrders) {
                await ordersRef.doc(order.id).set(order);
            }
        }
        // 5. Seed default settings
        const settingsRef = db.collection('system_settings');
        const settingsSnapshot = await settingsRef.limit(1).get();
        if (settingsSnapshot.empty) {
            console.log('🌱 Seeding default system settings...');
            const defaultSettings = [
                { key: 'site_name', val: 'VIP Commerce Control Center', group: 'general' },
                { key: 'site_url', val: 'https://admin.vipcommerce.com', group: 'general' },
                { key: 'timezone', val: 'Asia/Dhaka (GMT+6)', group: 'general' },
                { key: 'currency', val: 'BDT (৳)', group: 'general' },
                { key: 'maintenance_mode', val: '0', group: 'general' },
                { key: 'email_provider', val: 'SendGrid', group: 'email' },
                { key: 'smtp_host', val: 'smtp.sendgrid.net', group: 'email' },
                { key: 'smtp_port', val: '587', group: 'email' },
                { key: 'cache_driver', val: 'Redis', group: 'cache' }
            ];
            for (const s of defaultSettings) {
                await settingsRef.doc(s.key).set({
                    setting_key: s.key,
                    setting_value: s.val,
                    group_name: s.group,
                    is_public: 0,
                    updated_at: new Date().toISOString()
                });
            }
        }
    });
    console.log('✅ Firestore seeding verification task successfully completed.');
}
exports.default = db;
//# sourceMappingURL=db.js.map