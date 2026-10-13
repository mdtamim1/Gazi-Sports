import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'


// Safe automatic cleanup of deprecated/stale localStorage cache keys
// Preserves: admin_token, admin_user, admin-theme, customer_token, cart_*, wishlist_*, pending_sync_orders
try {
  const PRESERVE_KEYS = new Set([
    'admin_token',
    'admin_user',
    'admin-theme',
    'customer_token',
    'pending_sync_orders'
  ]);

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('cart_') || key.startsWith('wishlist_')) continue;
    if (PRESERVE_KEYS.has(key)) continue;

    if (
      key === 'sf_config_v1' ||
      key === 'storefront_config' ||
      key === 'gazi_products_cache_v2' ||
      key === 'gazi_products_cache' ||
      key === 'orderList' ||
      key === 'productList' ||
      key === 'activityList' ||
      key === 'employeeList' ||
      key === 'campaignList' ||
      key === 'storefront_customers' ||
      key === 'storefront_active_customer' ||
      key === 'storefront_chats' ||
      key === 'spin_win_reward' ||
      key.startsWith('customer_orders_') ||
      key.startsWith('customer_coupons_') ||
      key.startsWith('product_reviews_')
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
} catch {}

// Global fetch interceptor to handle auth token expiration/invalidations
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  
  if (response.status === 401 || response.status === 403) {
    const token = localStorage.getItem('admin_token');
    if (token) {
      console.warn("Auth token invalid or expired. Logging out...");
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login?expired=true';
      }
    }
  } else {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body && body.status === 'error' && body.message && (
        body.message.toLowerCase().includes('invalid token') ||
        body.message.toLowerCase().includes('expired token') ||
        body.message.toLowerCase().includes('token is required')
      )) {
        const token = localStorage.getItem('admin_token');
        if (token) {
          console.warn("Auth token invalid response received. Logging out...");
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/admin/login?expired=true';
          }
        }
      }
    } catch (e) {
      // Ignore JSON parse errors for non-JSON responses
    }
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
