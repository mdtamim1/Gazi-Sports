import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import db from '../config/db';
import { logSecurityAction } from '../utils/auditLogger';
import { generateSitemap } from '../utils/sitemap';
import { cacheService } from '../services/cacheService';

const keyMapToCamel: Record<string, string> = {
  site_name: 'siteName',
  site_url: 'siteUrl',
  timezone: 'timezone',
  currency: 'currency',
  maintenance_mode: 'maintenanceMode',
  email_provider: 'emailProvider',
  smtp_host: 'smtpHost',
  smtp_port: 'smtpPort',
  smtp_user: 'smtpUser',
  smtp_pass: 'smtpPass',
  payment_bkash: 'paymentBkash',
  payment_nagad: 'paymentNagad',
  payment_sslcommerz: 'paymentSslCommerz',
  payment_cod: 'paymentCod',
  shipping_pathao: 'shippingPathao',
  shipping_steadfast: 'shippingSteadfast',
  shipping_redx: 'shippingRedx',
  cache_driver: 'cacheDriver',
  cache_ttl: 'cacheTTL',
  steadfast_api_key: 'steadfastApiKey',
  steadfast_secret_key: 'steadfastSecretKey',
};

const keyMapToSnake: Record<string, string> = {
  siteName: 'site_name',
  siteUrl: 'site_url',
  timezone: 'timezone',
  currency: 'currency',
  maintenanceMode: 'maintenance_mode',
  emailProvider: 'email_provider',
  smtpHost: 'smtp_host',
  smtpPort: 'smtp_port',
  smtpUser: 'smtp_user',
  smtpPass: 'smtp_pass',
  paymentBkash: 'payment_bkash',
  paymentNagad: 'payment_nagad',
  paymentSslCommerz: 'payment_sslcommerz',
  paymentCod: 'payment_cod',
  shippingPathao: 'shipping_pathao',
  shippingSteadfast: 'shipping_steadfast',
  shippingRedx: 'shipping_redx',
  cacheDriver: 'cache_driver',
  cacheTTL: 'cache_ttl',
  steadfastApiKey: 'steadfast_api_key',
  steadfastSecretKey: 'steadfast_secret_key',
};

export const getSettings = (req: Request, res: Response) => {
  db.all('SELECT setting_key, setting_value FROM system_settings', [], (err, rows: any[]) => {
    if (err) {
      console.error('Failed to load system settings:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    const settingsObj: Record<string, any> = {
      // default fallbacks for safety
      siteName: 'Gazi Sports 24',
      siteUrl: 'https://gazisports24.com',
      timezone: 'Asia/Dhaka (GMT+6)',
      currency: 'BDT (৳)',
      maintenanceMode: false,
      emailProvider: 'SendGrid',
      smtpHost: 'smtp.sendgrid.net',
      smtpPort: 587,
      smtpUser: 'apikey',
      smtpPass: '••••••••••••••••••••',
      paymentBkash: true,
      paymentNagad: true,
      paymentSslCommerz: false,
      paymentCod: true,
      shippingPathao: true,
      shippingSteadfast: true,
      shippingRedx: false,
      cacheDriver: 'Redis',
      cacheHitRate: 94.2,
      cacheSize: '2.4 GB',
      cacheTTL: 3600,
      steadfastApiKey: process.env.STEADFAST_API_KEY || 'fpggi3zhnga1t85ipmpu3h1giz7ijv5c',
      steadfastSecretKey: process.env.STEADFAST_SECRET_KEY || 'o2trao0astdvtkctkwyg7o3j',
    };

    if (rows && rows.length > 0) {
      rows.forEach(row => {
        const camelKey = keyMapToCamel[row.setting_key];
        if (camelKey) {
          let val: any = row.setting_value;
          if (
            camelKey === 'maintenanceMode' ||
            camelKey === 'paymentBkash' ||
            camelKey === 'paymentNagad' ||
            camelKey === 'paymentSslCommerz' ||
            camelKey === 'paymentCod' ||
            camelKey === 'shippingPathao' ||
            camelKey === 'shippingSteadfast' ||
            camelKey === 'shippingRedx'
          ) {
            val = val === '1' || val === 'true';
          } else if (camelKey === 'smtpPort' || camelKey === 'cacheTTL') {
            val = parseInt(val) || (camelKey === 'smtpPort' ? 587 : 3600);
          }
          settingsObj[camelKey] = val;
        }
      });
    }

    res.json({ status: 'success', data: settingsObj });
  });
};

export const updateSettings = (req: Request, res: Response) => {
  const settingsData = req.body;
  const keys = Object.keys(settingsData).filter(k => keyMapToSnake[k]);

  if (keys.length === 0) {
    return res.json({ status: 'success', message: 'System settings updated successfully (no changes)' });
  }

  const dbType = process.env.DB_TYPE || 'sqlite';
  const isSqlite = dbType === 'sqlite';

  const startTx = (cb: (err: any) => void) => {
    if (isSqlite) {
      db.run('BEGIN TRANSACTION', cb);
    } else {
      cb(null);
    }
  };

  const commitTx = (cb: (err: any) => void) => {
    if (isSqlite) {
      db.run('COMMIT', cb);
    } else {
      cb(null);
    }
  };

  const rollbackTx = (cb: () => void) => {
    if (isSqlite) {
      db.run('ROLLBACK', () => cb());
    } else {
      cb();
    }
  };

  startTx((txErr) => {
    if (txErr) {
      console.error('Failed to start transaction:', txErr);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    let index = 0;
    const updateNext = () => {
      if (index === keys.length) {
        commitTx((commitErr) => {
          if (commitErr) {
            console.error('Failed to commit transaction:', commitErr);
            rollbackTx(() => {
              res.status(500).json({ status: 'error', message: 'Failed to commit system settings' });
            });
            return;
          }
          const actor = (req as any).user;
          logSecurityAction(
            actor?.id || null,
            actor?.email || null,
            'SETTINGS_UPDATE',
            `System settings updated: ${keys.join(', ')}`,
            req
          );
          res.json({ status: 'success', message: 'System settings updated successfully' });
        });
        return;
      }

      const camelKey = keys[index];
      const snakeKey = keyMapToSnake[camelKey];
      let val = settingsData[camelKey];
      if (typeof val === 'boolean') {
        val = val ? '1' : '0';
      } else {
        val = String(val);
      }

      db.run(
        `INSERT OR REPLACE INTO system_settings (setting_key, setting_value) VALUES (?, ?)`,
        [snakeKey, val],
        (err) => {
          if (err) {
            console.error(`Failed to update setting key ${snakeKey}:`, err);
            rollbackTx(() => {
              res.status(500).json({ status: 'error', message: 'Failed to update system settings' });
            });
            return;
          }
          index++;
          updateNext();
        }
      );
    };

    updateNext();
  });
};

export const getStorefrontSettings = async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  const cacheKey = 'settings:storefront';
  try {
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return res.json({ status: 'success', data: cached });
    }
  } catch {}

  db.get(
    "SELECT setting_value FROM system_settings WHERE setting_key = 'storefront_config'",
    [],
    (err, row: any) => {
      if (err) {
        console.error('Failed to load storefront settings:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!row || !row.setting_value) {
        return res.json({ status: 'success', data: null });
      }
      try {
        const data = JSON.parse(row.setting_value);
        cacheService.set(cacheKey, data, 600).catch(() => {});
        res.json({ status: 'success', data });
      } catch {
        res.status(500).json({ status: 'error', message: 'Failed to parse storefront settings' });
      }
    }
  );
};

/**
 * Deep merge two objects safely.
 * - Arrays: prefer incoming if non-empty, else keep current.
 * - Objects: recursively merge; incoming null/undefined never overwrites current.
 * This prevents auto-reset of storefront settings (Task 3 fix).
 */
function deepMergeConfigs(current: any, incoming: any): any {
  if (!incoming || typeof incoming !== 'object') return current ?? incoming;
  if (Array.isArray(incoming)) {
    return incoming.length > 0 ? incoming : (current || []);
  }
  if (typeof current === 'object' && !Array.isArray(current) && current !== null) {
    const result: any = { ...current };
    for (const key of Object.keys(incoming)) {
      const inVal = incoming[key];
      const curVal = current[key];
      if (inVal === null || inVal === undefined) continue; // never wipe with null
      if (Array.isArray(inVal)) {
        result[key] = inVal.length > 0 ? inVal : (curVal || []);
      } else if (typeof inVal === 'object' && typeof curVal === 'object' && curVal !== null && !Array.isArray(curVal)) {
        result[key] = deepMergeConfigs(curVal, inVal);
      } else {
        result[key] = inVal;
      }
    }
    return result;
  }
  return incoming;
}

export const updateStorefrontSettings = (req: Request, res: Response) => {
  // Read current config first so we can deep-merge (prevents any field from being accidentally wiped)
  db.get(
    "SELECT setting_value FROM system_settings WHERE setting_key = 'storefront_config'",
    [],
    (readErr, row: any) => {
      let currentConfig: any = {};
      if (!readErr && row && row.setting_value) {
        try { currentConfig = JSON.parse(row.setting_value); } catch {}
      }

      // Deep merge: incoming changes applied on top of current without erasing untouched fields
      const mergedConfig = deepMergeConfigs(currentConfig, req.body);
      const configString = JSON.stringify(mergedConfig);

      db.run(
        "INSERT OR REPLACE INTO system_settings (setting_key, setting_value, group_name, is_public) VALUES ('storefront_config', ?, 'storefront', 1)",
        [configString],
        (err) => {
          if (err) {
            console.error('Failed to update storefront settings:', err);
            return res.status(500).json({ status: 'error', message: 'Database error' });
          }
          // Invalidate memory cache immediately
          cacheService.del('settings:storefront').catch(() => {});
          const actor = (req as any).user;
          // Task 2: log with before/after snapshot for full audit trail
          logSecurityAction(
            actor?.id || null,
            actor?.email || null,
            'SETTINGS_UPDATE',
            'Storefront layout configuration updated',
            req,
            currentConfig,
            mergedConfig
          );
          res.json({ status: 'success', message: 'Storefront settings updated successfully' });
          generateSitemap().catch(console.error);
        }
      );
    }
  );
};


export const uploadMedia = async (req: Request, res: Response) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ status: 'error', message: 'No media data provided' });
    }

    const matches = base64Data.match(/^data:([A-Za-z0-9-+/_]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'mp4';

    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('webm')) ext = 'webm';
      else if (mime.includes('mp4')) ext = 'mp4';
      else if (mime.includes('png')) ext = 'png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({ status: 'error', message: 'File too large. Maximum size is 50MB.' });
    }

    const uploadsDir = path.resolve(__dirname, '../../uploads/media');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeFilename = `hero-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(uploadsDir, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/media/${safeFilename}`;
    res.json({ status: 'success', url: publicUrl });
  } catch (err: any) {
    console.error('Media upload failed:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Media upload failed' });
  }
};
