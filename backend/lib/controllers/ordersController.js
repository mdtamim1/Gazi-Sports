"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrder = exports.updateOrderStatus = exports.createOrder = exports.getOrderById = exports.getOrders = void 0;
const db_1 = __importDefault(require("../config/db"));
const getOrders = async (req, res) => {
    try {
        const ordersSnapshot = await db_1.default.collection('orders').orderBy('created_at', 'desc').get();
        const orders = ordersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                productsList: data.productsList || []
            };
        });
        res.json({ status: 'success', data: orders });
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getOrders = getOrders;
const getOrderById = async (req, res) => {
    const { id } = req.params;
    try {
        const orderDoc = await db_1.default.collection('orders').doc(id).get();
        if (!orderDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }
        const data = orderDoc.data();
        res.json({
            status: 'success',
            data: {
                id: orderDoc.id,
                ...data,
                productsList: data.productsList || []
            }
        });
    }
    catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getOrderById = getOrderById;
const createOrder = async (req, res) => {
    const { customer, email, amount, items, paymentMethod, storeName, phone, address, courier, city, thana, area, customerNote, shopNote, paymentType, memoNumber, deliveryCharge, discount, paidAmount, subtotal, productsList, } = req.body;
    const id = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
    try {
        const orderData = {
            customer: customer || '',
            email: email || '',
            amount: Number(amount) || 0,
            items: Number(items) || 0,
            payment_method: paymentMethod || '',
            store_name: storeName || '',
            phone: phone || '',
            address: address || '',
            courier: courier || '',
            city: city || '',
            thana: thana || '',
            area: area || '',
            customer_note: customerNote || '',
            shop_note: shopNote || '',
            payment_type: paymentType || 'cod',
            memo_number: memoNumber || '',
            delivery_charge: Number(deliveryCharge) || 0,
            discount: Number(discount) || 0,
            paid_amount: Number(paidAmount) || 0,
            subtotal: Number(subtotal) || 0,
            status: 'pending',
            created_at: new Date().toISOString(),
            productsList: Array.isArray(productsList) ? productsList.map((item) => ({
                name: item.name || item.product_name || '',
                color: item.color || 'Default',
                size: item.size || 'Free Size',
                code: item.code || '',
                quantity: Number(item.quantity) || 0,
                price: Number(item.price) || 0
            })) : []
        };
        await db_1.default.collection('orders').doc(id).set(orderData);
        res.json({ status: 'success', message: 'Order created successfully', data: { id } });
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.createOrder = createOrder;
const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const orderRef = db_1.default.collection('orders').doc(id);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }
        await orderRef.update({ status });
        res.json({ status: 'success', message: 'Order status updated' });
    }
    catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const updateOrder = async (req, res) => {
    const { id } = req.params;
    const { customer, email, amount, items, paymentMethod, storeName, phone, address, courier, city, thana, area, customerNote, shopNote, paymentType, memoNumber, deliveryCharge, discount, paidAmount, subtotal, status, productsList, } = req.body;
    try {
        const orderRef = db_1.default.collection('orders').doc(id);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }
        const updateData = {};
        if (customer !== undefined)
            updateData.customer = customer;
        if (email !== undefined)
            updateData.email = email;
        if (amount !== undefined)
            updateData.amount = Number(amount);
        if (items !== undefined)
            updateData.items = Number(items);
        if (paymentMethod !== undefined)
            updateData.payment_method = paymentMethod;
        if (storeName !== undefined)
            updateData.store_name = storeName;
        if (phone !== undefined)
            updateData.phone = phone;
        if (address !== undefined)
            updateData.address = address;
        if (courier !== undefined)
            updateData.courier = courier;
        if (city !== undefined)
            updateData.city = city;
        if (thana !== undefined)
            updateData.thana = thana;
        if (area !== undefined)
            updateData.area = area;
        if (customerNote !== undefined)
            updateData.customer_note = customerNote;
        if (shopNote !== undefined)
            updateData.shop_note = shopNote;
        if (paymentType !== undefined)
            updateData.payment_type = paymentType;
        if (memoNumber !== undefined)
            updateData.memo_number = memoNumber;
        if (deliveryCharge !== undefined)
            updateData.delivery_charge = Number(deliveryCharge);
        if (discount !== undefined)
            updateData.discount = Number(discount);
        if (paidAmount !== undefined)
            updateData.paid_amount = Number(paidAmount);
        if (subtotal !== undefined)
            updateData.subtotal = Number(subtotal);
        if (status !== undefined)
            updateData.status = status;
        if (productsList !== undefined) {
            updateData.productsList = Array.isArray(productsList) ? productsList.map((item) => ({
                name: item.name || item.product_name || '',
                color: item.color || 'Default',
                size: item.size || 'Free Size',
                code: item.code || '',
                quantity: Number(item.quantity) || 0,
                price: Number(item.price) || 0
            })) : [];
        }
        await orderRef.update(updateData);
        res.json({ status: 'success', message: 'Order updated successfully' });
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.updateOrder = updateOrder;
//# sourceMappingURL=ordersController.js.map