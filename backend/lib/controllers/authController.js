"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.logout = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const JWT_SECRET = process.env.JWT_SECRET || 'super-premium-jwt-secret-key-1283';
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }
    try {
        const employeeQuery = await db_1.default.collection('employees').where('email', '==', email).limit(1).get();
        if (employeeQuery.empty) {
            return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }
        const employeeDoc = employeeQuery.docs[0];
        const employee = { id: employeeDoc.id, ...employeeDoc.data() };
        if (employee.status !== 'active') {
            return res.status(403).json({ status: 'error', message: 'Account is inactive or suspended' });
        }
        // Fetch role name from roles collection
        const roleDoc = await db_1.default.collection('roles').doc(employee.role_id).get();
        const roleName = roleDoc.exists ? (roleDoc.data()?.name || 'Staff') : 'Staff';
        // Safe check for hashed password comparison
        bcryptjs_1.default.compare(password, employee.password_hash, async (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                id: employee.id,
                email: employee.email,
                role: roleName,
                name: `${employee.first_name} ${employee.last_name}`,
            }, JWT_SECRET, { expiresIn: '8h' });
            // Update last login details
            const lastLoginIp = req.ip || req.socket.remoteAddress || '';
            await db_1.default.collection('employees').doc(employee.id).update({
                last_login_at: new Date().toISOString(),
                last_login_ip: lastLoginIp
            });
            res.json({
                status: 'success',
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: employee.id,
                        email: employee.email,
                        name: `${employee.first_name} ${employee.last_name}`,
                        role: roleName,
                        department: employee.department,
                        avatar: employee.first_name.substring(0, 1) + employee.last_name.substring(0, 1),
                    },
                },
            });
        });
    }
    catch (error) {
        console.error('Error during employee login:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.login = login;
const logout = (req, res) => {
    res.json({ status: 'success', message: 'Logout successful' });
};
exports.logout = logout;
const getProfile = (req, res) => {
    res.json({ status: 'success', data: req.user });
};
exports.getProfile = getProfile;
//# sourceMappingURL=authController.js.map