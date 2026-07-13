"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAddresses = exports.updateCustomerProfile = exports.getCustomerProfile = exports.loginGmailCustomer = exports.loginCustomer = exports.registerCustomer = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const JWT_SECRET = process.env.JWT_SECRET || 'super-premium-jwt-secret-key-1283';
// Utility helper to split a name into first and last names
const parseName = (fullName) => {
    const parts = fullName.trim().split(' ');
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';
    return { first_name, last_name };
};
// Helper to sort addresses (isDefault first)
const sortAddresses = (addresses) => {
    return [...addresses].sort((a, b) => {
        if (a.isDefault && !b.isDefault)
            return -1;
        if (!a.isDefault && b.isDefault)
            return 1;
        return 0;
    });
};
// Register customer
const registerCustomer = async (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ status: 'error', message: 'Name, email, and password are required' });
    }
    try {
        const customerQuery = await db_1.default.collection('customers').where('email', '==', email).limit(1).get();
        if (!customerQuery.empty) {
            return res.status(400).json({ status: 'error', message: 'এই ইমেইল দিয়ে অলরেডি অ্যাকাউন্ট তৈরি করা আছে' });
        }
        bcryptjs_1.default.hash(password, 10, async (err, hash) => {
            if (err) {
                return res.status(500).json({ status: 'error', message: 'Error hashing password' });
            }
            const { first_name, last_name } = parseName(name);
            const customerId = `cust-${Date.now()}`;
            const customerData = {
                first_name,
                last_name,
                email,
                password_hash: hash,
                phone: phone || '',
                loyalty_points: 0,
                segment: 'New',
                status: 'active',
                risk_score: 0,
                total_spent: 0.0,
                order_count: 0,
                last_active_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                addresses: []
            };
            await db_1.default.collection('customers').doc(customerId).set(customerData);
            const token = jsonwebtoken_1.default.sign({ id: customerId, email, role: 'customer', name }, JWT_SECRET, { expiresIn: '30d' });
            res.json({
                status: 'success',
                data: {
                    token,
                    customer: {
                        id: customerId,
                        name,
                        email,
                        phone: phone || '',
                        createdAt: customerData.created_at,
                        addresses: []
                    }
                }
            });
        });
    }
    catch (error) {
        console.error('Error registering customer:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.registerCustomer = registerCustomer;
// Login customer
const loginCustomer = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }
    try {
        const customerQuery = await db_1.default.collection('customers').where('email', '==', email).limit(1).get();
        if (customerQuery.empty) {
            return res.status(401).json({ status: 'error', message: 'আপনার ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়' });
        }
        const customerDoc = customerQuery.docs[0];
        const customer = { id: customerDoc.id, ...customerDoc.data() };
        if (customer.status !== 'active') {
            return res.status(403).json({ status: 'error', message: 'অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে' });
        }
        bcryptjs_1.default.compare(password, customer.password_hash, async (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ status: 'error', message: 'আপনার ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়' });
            }
            const addresses = sortAddresses(customer.addresses || []);
            const fullName = `${customer.first_name} ${customer.last_name}`.trim();
            const token = jsonwebtoken_1.default.sign({ id: customer.id, email: customer.email, role: 'customer', name: fullName }, JWT_SECRET, { expiresIn: '30d' });
            // Update last active
            await db_1.default.collection('customers').doc(customer.id).update({
                last_active_at: new Date().toISOString()
            });
            res.json({
                status: 'success',
                data: {
                    token,
                    customer: {
                        id: customer.id,
                        name: fullName,
                        email: customer.email,
                        phone: customer.phone || '',
                        createdAt: customer.created_at,
                        avatar: fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
                        addresses
                    }
                }
            });
        });
    }
    catch (error) {
        console.error('Error during customer login:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.loginCustomer = loginCustomer;
// Login/Register with Gmail (Simulate)
const loginGmailCustomer = async (req, res) => {
    const { email, name } = req.body;
    if (!email || !name) {
        return res.status(400).json({ status: 'error', message: 'Email and Name are required' });
    }
    try {
        const customerQuery = await db_1.default.collection('customers').where('email', '==', email).limit(1).get();
        if (!customerQuery.empty) {
            const customerDoc = customerQuery.docs[0];
            const customer = { id: customerDoc.id, ...customerDoc.data() };
            const addresses = sortAddresses(customer.addresses || []);
            const fullName = `${customer.first_name} ${customer.last_name}`.trim();
            const token = jsonwebtoken_1.default.sign({ id: customer.id, email: customer.email, role: 'customer', name: fullName }, JWT_SECRET, { expiresIn: '30d' });
            await db_1.default.collection('customers').doc(customer.id).update({
                last_active_at: new Date().toISOString()
            });
            res.json({
                status: 'success',
                data: {
                    token,
                    customer: {
                        id: customer.id,
                        name: fullName,
                        email: customer.email,
                        phone: customer.phone || '',
                        createdAt: customer.created_at,
                        avatar: fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
                        isGmail: true,
                        addresses
                    }
                }
            });
        }
        else {
            const { first_name, last_name } = parseName(name);
            const customerId = `cust-${Date.now()}`;
            const dummyHash = 'gmail_oauth_dummy';
            const customerData = {
                first_name,
                last_name,
                email,
                password_hash: dummyHash,
                phone: '',
                loyalty_points: 0,
                segment: 'New',
                status: 'active',
                risk_score: 0,
                total_spent: 0.0,
                order_count: 0,
                last_active_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                addresses: []
            };
            await db_1.default.collection('customers').doc(customerId).set(customerData);
            const token = jsonwebtoken_1.default.sign({ id: customerId, email, role: 'customer', name }, JWT_SECRET, { expiresIn: '30d' });
            res.json({
                status: 'success',
                data: {
                    token,
                    customer: {
                        id: customerId,
                        name,
                        email,
                        phone: '',
                        createdAt: customerData.created_at,
                        avatar: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
                        isGmail: true,
                        addresses: []
                    }
                }
            });
        }
    }
    catch (error) {
        console.error('Error during Gmail login:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.loginGmailCustomer = loginGmailCustomer;
// Get Customer Profile details
const getCustomerProfile = async (req, res) => {
    const customerId = req.user.id;
    try {
        const customerDoc = await db_1.default.collection('customers').doc(customerId).get();
        if (!customerDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Customer profile not found' });
        }
        const customer = customerDoc.data();
        const addresses = sortAddresses(customer.addresses || []);
        const fullName = `${customer.first_name} ${customer.last_name}`.trim();
        res.json({
            status: 'success',
            data: {
                id: customerDoc.id,
                name: fullName,
                email: customer.email,
                phone: customer.phone || '',
                createdAt: customer.created_at,
                avatar: fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
                addresses
            }
        });
    }
    catch (error) {
        console.error('Error fetching customer profile:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getCustomerProfile = getCustomerProfile;
// Update Customer Profile
const updateCustomerProfile = async (req, res) => {
    const customerId = req.user.id;
    const { name, phone } = req.body;
    if (!name) {
        return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    try {
        const customerRef = db_1.default.collection('customers').doc(customerId);
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Customer not found' });
        }
        const { first_name, last_name } = parseName(name);
        await customerRef.update({
            first_name,
            last_name,
            phone: phone || '',
            last_active_at: new Date().toISOString()
        });
        res.json({
            status: 'success',
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating customer profile:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.updateCustomerProfile = updateCustomerProfile;
// Get Customer Addresses
const getAddresses = async (req, res) => {
    const customerId = req.user.id;
    try {
        const customerDoc = await db_1.default.collection('customers').doc(customerId).get();
        if (!customerDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Customer not found' });
        }
        const customer = customerDoc.data();
        const addresses = sortAddresses(customer.addresses || []);
        res.json({ status: 'success', data: addresses });
    }
    catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getAddresses = getAddresses;
// Add customer address
const addAddress = async (req, res) => {
    const customerId = req.user.id;
    const { label, name, phone, address, isDefault } = req.body;
    if (!label || !name || !phone || !address) {
        return res.status(400).json({ status: 'error', message: 'Label, Name, Phone, and Address are required' });
    }
    try {
        const customerRef = db_1.default.collection('customers').doc(customerId);
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Customer not found' });
        }
        const customer = customerDoc.data();
        let currentAddresses = customer.addresses || [];
        const addressId = `addr-${Date.now()}`;
        const isFirst = currentAddresses.length === 0;
        const shouldBeDefault = isFirst ? true : !!isDefault;
        if (shouldBeDefault) {
            // Set all existing addresses to non-default
            currentAddresses = currentAddresses.map((addr) => ({
                ...addr,
                isDefault: false
            }));
        }
        const newAddress = {
            id: addressId,
            label,
            name,
            phone,
            address,
            isDefault: shouldBeDefault
        };
        currentAddresses.push(newAddress);
        await customerRef.update({
            addresses: currentAddresses,
            last_active_at: new Date().toISOString()
        });
        res.json({
            status: 'success',
            data: newAddress
        });
    }
    catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.addAddress = addAddress;
// Update customer address
const updateAddress = async (req, res) => {
    const customerId = req.user.id;
    const addressId = req.params.id;
    const { label, name, phone, address, isDefault } = req.body;
    try {
        const customerRef = db_1.default.collection('customers').doc(customerId);
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Customer not found' });
        }
        const customer = customerDoc.data();
        let currentAddresses = customer.addresses || [];
        const addressIndex = currentAddresses.findIndex((addr) => addr.id === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ status: 'error', message: 'Address not found' });
        }
        const shouldBeDefault = !!isDefault;
        if (shouldBeDefault) {
            currentAddresses = currentAddresses.map((addr) => ({
                ...addr,
                isDefault: false
            }));
        }
        currentAddresses[addressIndex] = {
            ...currentAddresses[addressIndex],
            label: label !== undefined ? label : currentAddresses[addressIndex].label,
            name: name !== undefined ? name : currentAddresses[addressIndex].name,
            phone: phone !== undefined ? phone : currentAddresses[addressIndex].phone,
            address: address !== undefined ? address : currentAddresses[addressIndex].address,
            isDefault: shouldBeDefault
        };
        await customerRef.update({
            addresses: currentAddresses,
            last_active_at: new Date().toISOString()
        });
        res.json({ status: 'success', message: 'Address updated successfully' });
    }
    catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.updateAddress = updateAddress;
// Delete customer address
const deleteAddress = async (req, res) => {
    const customerId = req.user.id;
    const addressId = req.params.id;
    try {
        const customerRef = db_1.default.collection('customers').doc(customerId);
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Customer not found' });
        }
        const customer = customerDoc.data();
        let currentAddresses = customer.addresses || [];
        const targetAddress = currentAddresses.find((addr) => addr.id === addressId);
        if (!targetAddress) {
            return res.status(404).json({ status: 'error', message: 'Address not found' });
        }
        const wasDefault = targetAddress.isDefault;
        // Filter out the deleted address
        currentAddresses = currentAddresses.filter((addr) => addr.id !== addressId);
        if (wasDefault && currentAddresses.length > 0) {
            // Make the first remaining address default
            currentAddresses[0] = {
                ...currentAddresses[0],
                isDefault: true
            };
        }
        await customerRef.update({
            addresses: currentAddresses,
            last_active_at: new Date().toISOString()
        });
        res.json({ status: 'success', message: 'Address deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.deleteAddress = deleteAddress;
// Set default customer address
const setDefaultAddress = async (req, res) => {
    const customerId = req.user.id;
    const addressId = req.params.id;
    try {
        const customerRef = db_1.default.collection('customers').doc(customerId);
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Customer not found' });
        }
        const customer = customerDoc.data();
        let currentAddresses = customer.addresses || [];
        const addressExists = currentAddresses.some((addr) => addr.id === addressId);
        if (!addressExists) {
            return res.status(404).json({ status: 'error', message: 'Address not found' });
        }
        currentAddresses = currentAddresses.map((addr) => ({
            ...addr,
            isDefault: addr.id === addressId
        }));
        await customerRef.update({
            addresses: currentAddresses,
            last_active_at: new Date().toISOString()
        });
        res.json({ status: 'success', message: 'Address set as default' });
    }
    catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.setDefaultAddress = setDefaultAddress;
//# sourceMappingURL=customersController.js.map