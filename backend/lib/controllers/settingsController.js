"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const db_1 = __importDefault(require("../config/db"));
const keyMapToCamel = {
    site_name: 'siteName',
    site_url: 'siteUrl',
    timezone: 'timezone',
    currency: 'currency',
    maintenance_mode: 'maintenanceMode',
    email_provider: 'emailProvider',
    smtp_host: 'smtpHost',
    smtp_port: 'smtpPort',
    cache_driver: 'cacheDriver',
};
const keyMapToSnake = {
    siteName: 'site_name',
    siteUrl: 'site_url',
    timezone: 'timezone',
    currency: 'currency',
    maintenanceMode: 'maintenance_mode',
    emailProvider: 'email_provider',
    smtpHost: 'smtp_host',
    smtpPort: 'smtp_port',
    cacheDriver: 'cache_driver',
};
const getSettings = async (req, res) => {
    try {
        const settingsSnapshot = await db_1.default.collection('system_settings').get();
        const settingsObj = {
            // default fallbacks for safety
            siteName: 'VIP Commerce Control Center',
            siteUrl: 'https://admin.vipcommerce.com',
            timezone: 'Asia/Dhaka (GMT+6)',
            currency: 'BDT (৳)',
            maintenanceMode: false,
            emailProvider: 'SendGrid',
            smtpHost: 'smtp.sendgrid.net',
            smtpPort: 587,
            cacheDriver: 'Redis',
            cacheHitRate: 94.2,
            cacheSize: '2.4 GB',
        };
        settingsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const camelKey = keyMapToCamel[doc.id];
            if (camelKey) {
                let val = data.setting_value;
                if (camelKey === 'maintenanceMode') {
                    val = val === '1' || val === 'true' || val === true;
                }
                else if (camelKey === 'smtpPort') {
                    val = parseInt(val) || 587;
                }
                settingsObj[camelKey] = val;
            }
        });
        res.json({ status: 'success', data: settingsObj });
    }
    catch (error) {
        console.error('Failed to load system settings:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    const settingsData = req.body;
    try {
        const batch = db_1.default.batch();
        for (const camelKey of Object.keys(settingsData)) {
            const snakeKey = keyMapToSnake[camelKey];
            if (snakeKey) {
                let val = settingsData[camelKey];
                if (typeof val === 'boolean') {
                    val = val ? '1' : '0';
                }
                else {
                    val = String(val);
                }
                const docRef = db_1.default.collection('system_settings').doc(snakeKey);
                batch.set(docRef, {
                    setting_key: snakeKey,
                    setting_value: val,
                    updated_at: new Date().toISOString()
                }, { merge: true });
            }
        }
        await batch.commit();
        res.json({ status: 'success', message: 'System settings updated successfully' });
    }
    catch (error) {
        console.error('Failed to update system settings:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.updateSettings = updateSettings;
//# sourceMappingURL=settingsController.js.map