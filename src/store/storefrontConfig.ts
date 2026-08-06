/**
 * Centralized Storefront Configuration Store
 * 
 * API-First: Config is always loaded from the backend API.
 * An in-memory cache (5 minutes TTL) is used to avoid redundant requests.
 * LocalStorage is NOT used for config persistence — admins updating settings
 * will be visible to all customers within 5 minutes.
 * 
 * When a real backend is added, swap localStorage calls for API calls.
 */

// ============================================================
// TYPES
// ============================================================

export interface BannerSlide {
  id: number;
  title: string;
  subtitle: string;
  gradient: string;
  image?: string;
  tag: string;
  offer: string;
  buttonText: string;
  buttonLink: string;
  enabled: boolean;
}

export interface AnnouncementItem {
  id: number;
  text: string;
  enabled: boolean;
}

export interface CategoryConfig {
  id: number;
  name: string;
  icon: string; // lucide icon name
  count: number;
  published: boolean;
  sortOrder: number;
  image?: string;
  useCustomImage?: boolean;
}

export interface NavLinkItem {
  id: number;
  label: string;
  url: string;
  enabled: boolean;
  productIds?: (string | number)[];
  timerEnabled?: boolean;
  timerStartDate?: string;
  timerEndDate?: string;
  timerLabel?: string;
  timerStartLabel?: string;
  customPageContent?: string;
}

export interface FooterColumn {
  title: string;
  links: NavLinkItem[];
}

export interface ContactInfo {
  whatsappNumber: string;
  phoneNumber: string;
  messengerUrl: string;
  email: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  instagramUrl?: string;
  shopLocationMapUrl?: string;
  shopAddress?: string;
}

export interface StoreBranding {
  storeName: string;
  logoTextPrimary: string;
  logoTextSecondary: string;
  footerDescription: string;
  copyrightText: string;
  paymentMethodsText: string;
}

export interface FeatureBadge {
  id: number;
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface DeliveryConfig {
  insideDhakaPrice: number;
  insideDhakaTimeline: string;
  outsideDhakaPrice: number;
  outsideDhakaTimeline: string;
}

export interface NewsletterConfig {
  heading: string;
  subtitle: string;
  buttonText: string;
  placeholderText: string;
}

export interface ProductConfig {
  id: number;
  name: string;
  category: string;
  brand: string;
  sku: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  badge: 'sale' | 'new' | null;
  inStock: boolean;
  published: boolean;
  description: string;
  features: string[];
  specs: { name: string; value: string }[];
  customerReviews: { id: number; user: string; rating: number; date: string; comment: string; helpful: number }[];
  relatedProducts: number[];
  stock?: number;
  sold?: number;
  revenue?: number;
  videoUrl?: string;
  photoContent?: string;
  sizes?: { label: string; enabled: boolean; price?: number; originalPrice?: number }[];
  slug?: string;
}

export interface MiddleBannerConfig {
  id: string;
  image: string;
  link: string;
  enabled: boolean;
}

export interface StorefrontConfig {
  banners: BannerSlide[];
  announcements: AnnouncementItem[];
  categories: CategoryConfig[];
  navLinks: NavLinkItem[];
  footerColumns: FooterColumn[];
  contactInfo: ContactInfo;
  branding: StoreBranding;
  featureBadges: FeatureBadge[];
  delivery: DeliveryConfig;
  newsletter: NewsletterConfig;
  products: ProductConfig[];
  mostSellingProductIds?: (string | number)[];
  trendingProductIds?: (string | number)[];
  newArrivalProductIds?: (string | number)[];
  middleBannerImage?: string;
  middleBannerLink?: string;
  middleBannerEnabled?: boolean;
  middleBanners?: MiddleBannerConfig[];
}

// ============================================================
// DEFAULT VALUES (matching current hardcoded content)
// ============================================================

const DEFAULT_BANNERS: BannerSlide[] = [];

const DEFAULT_ANNOUNCEMENTS: AnnouncementItem[] = [
  { id: 1, text: "🎉 Gazi Sports means power, play & joy! Special discounts on all products!", enabled: true },
  { id: 2, text: "🚚 Cash on delivery all over Bangladesh and fast home delivery!", enabled: true },
  { id: 3, text: "📞 Call or WhatsApp us for any query: +8801321832605", enabled: true }
];

const DEFAULT_CATEGORIES: CategoryConfig[] = [];

const DEFAULT_NAV_LINKS: NavLinkItem[] = [
  { id: 1, label: 'Home', url: '/', enabled: true },
  { id: 3, label: 'Shop', url: '/collection/fitness-item', enabled: true },
  { id: 15, label: 'Blogs', url: '/blogs', enabled: true },
  { id: 4, label: 'My account', url: '/account', enabled: true },
  { id: 5, label: 'Contact', url: '/page/6', enabled: true },
];

const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Quick Links',
    links: [
      { id: 1, label: 'Home', url: '/', enabled: true },
      { id: 2, label: 'Shop All', url: '/collection/fitness-item', enabled: true },
      { id: 3, label: 'New Arrivals', url: '/collection/fitness-item', enabled: true },
      { id: 4, label: 'Best Sellers', url: '/collection/fitness-item', enabled: true },
      { id: 5, label: 'Sale', url: '/collection/fitness-item', enabled: true },
    ],
  },
  {
    title: 'Customer Service',
    links: [
      { id: 6, label: 'Contact Us', url: '/', enabled: true, customPageContent: '<h3>Contact Us</h3><p>Please contact us directly at the following numbers:</p><p>📞 <strong>Mobile:</strong> +8801321832605</p><p>💬 <strong>WhatsApp:</strong> +8801321832605</p><p>✉️ <strong>Email:</strong> support@gazisports24.com</p><p>You can contact us for any query.</p>' },
      { id: 7, label: 'Shipping Info', url: '/', enabled: true, customPageContent: '<h3>Delivery Policy & Charges</h3><p>We use reliable delivery partners to deliver any of our products to your doorstep.</p><p>📍 <strong>Inside Dhaka:</strong> Delivery charge 60 Tk (Time: 1-2 working days)</p><p>📍 <strong>Outside Dhaka:</strong> Delivery charge 120 Tk (Time: 2-3 working days)</p><p>📦 Free delivery all over Bangladesh for orders above 5,000 Tk.</p>' },
      { id: 8, label: 'Returns & Exchanges', url: '/', enabled: true, customPageContent: '<h3>Return & Exchange Policy</h3><p>If any issue arises after purchasing our product or if you are not satisfied, you can easily exchange or return it within 7 days.</p><p>⚠️ <strong>Terms & Conditions:</strong></p><ul><li>The product must be unused and in brand new condition.</li><li>Original packaging and memo must be kept.</li></ul>' },
      { id: 9, label: 'FAQ', url: '/', enabled: true, customPageContent: '<h3>Frequently Asked Questions (FAQ)</h3><p><strong>1. How do I place an order?</strong><br/>Select the product, click "Order Now", and confirm your order by providing your name, address, and mobile number.</p><p><strong>2. Can I get Cash on Delivery?</strong><br/>Yes, we offer Cash on Delivery (payment upon receiving the product) all over Bangladesh.</p>' },
    ],
  },
  {
    title: 'Company',
    links: [
      { id: 11, label: 'About Us', url: '/', enabled: true, customPageContent: '<h3>About Us</h3><p><strong>Gazi Sports</strong> is a leading online sports retail platform. Our goal is to deliver high-quality gym and fitness equipment, shoes, and sports items to your doorstep at affordable prices.</p>' },
      { id: 13, label: 'Privacy Policy', url: '/', enabled: true, customPageContent: '<p><strong>Effective Date:</strong> July 9, 2026</p><p>Welcome to Gazi Sports. We value your privacy and are committed to protecting your personal information. This Privacy Policy details how we collect, use, and secure your information.</p><h3>1. Information We Collect</h3><p>When you use our website or place an order, we may collect the following information:</p><ul><li><strong>Personal Information:</strong> Your name, delivery address, mobile number, and email address.</li><li><strong>Order Information:</strong> Details of products purchased, order history, and payment-related information.</li><li><strong>Usage Data:</strong> Your browsing activity, preferred products, and device information.</li></ul><h3>2. Purpose of Using Information</h3><p>We use the collected information for the following purposes:</p><ul><li>Processing your order and ensuring delivery to the correct address.</li><li>Sending order updates and information to your mobile or email.</li><li>Improving our services and simplifying your shopping experience.</li><li>Providing quick customer support for complaints or queries.</li></ul><h3>3. Data Security</h3><p>We take all necessary measures to ensure the security of your personal information. Your information is stored on secure encrypted servers and is never sold or shared with any third party.</p><h3>4. Cookie Policy</h3><p>Our website uses cookies to enhance your browsing experience. You can disable cookies from browser settings if you wish, though this may limit some features.</p><h3>5. Sharing Information</h3><p>We never share your information with third parties except in the following cases:</p><ul><li><strong>Delivery Partners:</strong> Only name and address are shared to deliver products.</li><li><strong>Legal Obligations:</strong> Information may be provided at the request of governmental or legal authorities.</li></ul><h3>6. Your Rights</h3><p>You can request to view, correct, or delete your personal information at any time by contacting us.</p><h3>7. Contact Us</h3><p>Contact us with any questions regarding this Privacy Policy:<br/><strong>Email:</strong> {{email}}<br/><strong>Phone:</strong> {{phone}}</p>' },
      { id: 14, label: 'Terms of Service', url: '/', enabled: true, customPageContent: '<p><strong>Effective Date:</strong> July 9, 2026</p><p>By using the Gazi Sports website, you agree to all the terms mentioned below. Please read these terms carefully before placing an order.</p><h3>1. General Terms</h3><ul><li>You must be at least 18 years old to use our website.</li><li>You are required to provide correct and true information. We reserve the right to cancel orders placed with false information.</li><li>Gazi Sports reserves the right to change our services or products at any time.</li></ul><h3>2. Order & Payment</h3><ul><li>Correct name, mobile number, and delivery address must be provided when ordering.</li><li>Full payment must be made upon receipt of product for Cash on Delivery.</li><li>To cancel an order after confirmation, contact our customer support immediately.</li></ul><h3>3. Delivery Policy</h3><ul><li>Delivery within Dhaka is usually completed in 1-2 working days.</li><li>Delivery outside Dhaka is usually completed in 2-3 working days.</li><li>Delivery may be delayed due to natural disasters, strikes, or other unavoidable reasons.</li><li>Check packaging in front of the delivery agent when receiving products.</li></ul><h3>4. Return & Exchange</h3><ul><li>If there is any defect in the product, return or exchange can be made within 7 days of delivery.</li><li>Returns are acceptable only if the product is unused, in original packaging, and with the purchase memo.</li><li>Used or damaged products are not eligible for return.</li></ul><h3>5. Product Pricing & Availability</h3><ul><li>Product prices are subject to change without prior notice.</li><li>Orders may be canceled if stock runs out, and any pre-payments will be refunded.</li></ul><h3>6. Limitation of Liability</h3><p>Gazi Sports always strives to ensure product quality. However, we will not be liable for any product damage due to user negligence. Follow proper product usage guidelines.</p><h3>7. Legal Jurisdiction</h3><p>These terms are governed by the laws of Bangladesh. Any disputes will be resolved in the courts of Bangladesh.</p><h3>8. Contact Us</h3><p>Contact us with any questions or complaints:<br/><strong>Email:</strong> {{email}}<br/><strong>Phone:</strong> {{phone}}</p>' },
    ],
  },
];

const DEFAULT_CONTACT_INFO: ContactInfo = {
  whatsappNumber: '8801321832605',
  phoneNumber: '01321832605',
  messengerUrl: 'https://m.me/gazisports',
  email: 'support@gazisports24.com',
  facebookUrl: 'https://facebook.com/gazisports',
  tiktokUrl: 'https://tiktok.com/@gazisports',
  instagramUrl: 'https://instagram.com/gazisports',
  shopLocationMapUrl: '',
  shopAddress: 'Sector 10, Uttara, Dhaka, Bangladesh',
};

const DEFAULT_BRANDING: StoreBranding = {
  storeName: 'Gazi Sports 24',
  logoTextPrimary: 'Tamim',
  logoTextSecondary: 'Global',
  footerDescription: 'Gazi Sports 24 — your one-stop destination for Gym Equipment, Sports Items & Kids Sports Products for the whole family.',
  copyrightText: '© 2026 Gazi Sports 24. All rights reserved.',
  paymentMethodsText: 'Cash on Delivery • BKash • Rocket • Visa • Mastercard',
};

const DEFAULT_FEATURE_BADGES: FeatureBadge[] = [
  { id: 1, icon: 'Truck', title: 'Fast Delivery', description: 'Inside & Outside Dhaka', enabled: true },
  { id: 2, icon: 'Shield', title: 'Secure Shopping', description: '100% authentic items', enabled: true },
  { id: 3, icon: 'RotateCcw', title: 'Easy Exchange', description: '7 days support window', enabled: true },
  { id: 4, icon: 'Headphones', title: 'Help Center', description: 'Live WhatsApp support', enabled: true },
];

const DEFAULT_DELIVERY: DeliveryConfig = {
  insideDhakaPrice: 60,
  insideDhakaTimeline: '1-2 days',
  outsideDhakaPrice: 120,
  outsideDhakaTimeline: '2-3 days',
};

const DEFAULT_NEWSLETTER: NewsletterConfig = {
  heading: 'Join Our Newsletter',
  subtitle: 'Get real-time discount drops and coupon codes directly in your inbox.',
  buttonText: 'Subscribe',
  placeholderText: 'Enter your email address',
};

const DEFAULT_PRODUCTS: ProductConfig[] = [];

// ============================================================
// STORAGE KEY
// ============================================================

const STORAGE_KEY = 'storefront_config';

// ============================================================
// CONFIG MANAGER
// ============================================================

import { getCachedProductsFromStorage } from '../services/api';

let _config: StorefrontConfig | null = null;
let _listeners: Array<() => void> = [];

function getDefaultConfig(): StorefrontConfig {
  const cachedProducts = getCachedProductsFromStorage();
  return {
    banners: DEFAULT_BANNERS,
    announcements: DEFAULT_ANNOUNCEMENTS,
    categories: DEFAULT_CATEGORIES,
    navLinks: DEFAULT_NAV_LINKS,
    footerColumns: DEFAULT_FOOTER_COLUMNS,
    contactInfo: { ...DEFAULT_CONTACT_INFO },
    branding: { ...DEFAULT_BRANDING },
    featureBadges: DEFAULT_FEATURE_BADGES,
    delivery: { ...DEFAULT_DELIVERY },
    newsletter: { ...DEFAULT_NEWSLETTER },
    products: cachedProducts && cachedProducts.length > 0 ? cachedProducts : DEFAULT_PRODUCTS,
    mostSellingProductIds: [],
    trendingProductIds: [],
    newArrivalProductIds: [],
    middleBannerImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
    middleBannerLink: '/collection/all',
    middleBannerEnabled: true,
    middleBanners: [
      {
        id: 'mb-1',
        image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
        link: '/collection/all',
        enabled: true,
      }
    ],
  };
}

// ============================================================
// CONFIG MIGRATION HELPER
// ============================================================
function migrateConfig(parsed: any): any {
  if (!parsed) return parsed;
  const defaults = getDefaultConfig();
  
  // Auto-migrate navigation links in local storage
  if (parsed.navLinks && Array.isArray(parsed.navLinks)) {
    let migrated = false;
    
    parsed.navLinks = parsed.navLinks
      .map((link: any) => {
        const labelLower = (link.label || '').toLowerCase();
        // Rename old labels
        if (labelLower === 'deals' || labelLower === 'deal') {
          migrated = true;
          link = { ...link, label: 'Offers', url: '/collection/offers' };
        }
        if (labelLower === 'brands' || labelLower === 'brand' || labelLower === 'popular') {
          migrated = true;
          link = { ...link, label: 'Popular Order', url: '/collection/popular-order' };
        }
        // Ensure New Arrivals has correct URL
        if (labelLower === 'new arrivals' || labelLower === 'new arrival') {
          if (link.url !== '/collection/new-arrivals') {
            migrated = true;
            link = { ...link, url: '/collection/new-arrivals' };
          }
          if (!link.productIds || link.productIds.length === 0) {
            migrated = true;
            link = { ...link, productIds: [6, 7] };
          }
        }
        // Ensure Popular Order has correct URL
        if (labelLower === 'popular order' || labelLower === 'popular') {
          if (link.url !== '/collection/popular-order') {
            migrated = true;
            link = { ...link, url: '/collection/popular-order' };
          }
          if (!link.productIds || link.productIds.length === 0) {
            migrated = true;
            link = { ...link, productIds: [2, 5] };
          }
        }
        // Ensure Offers has correct URL and products
        if (labelLower === 'offers' || labelLower === 'offer') {
          if (link.url !== '/collection/offers') {
            migrated = true;
            link = { ...link, url: '/collection/offers' };
          }
          if (!link.productIds || link.productIds.length === 0) {
            migrated = true;
            link = { ...link, productIds: [1, 3] };
          }
        }
        // Strip '/store' from any other URL
        let url = link.url || '';
        if (url.startsWith('/store/')) {
          migrated = true;
          link = { ...link, url: url.replace('/store/', '/') };
        } else if (url === '/store') {
          migrated = true;
          link = { ...link, url: '/' };
        }
        // Migrate hash-based URLs to route-based collection pages
        if (url.includes('/store#') && link.productIds && link.productIds.length > 0) {
          const hash = url.split('#')[1];
          if (hash) {
            migrated = true;
            link = { ...link, url: `/collection/${hash}` };
          }
        }
        return link;
      })
      .filter((link: any) => {
        const labelLower = (link.label || '').toLowerCase();
        const keep = labelLower !== 'offers' && labelLower !== 'offer' && labelLower !== 'deals' && labelLower !== 'deal';
        if (!keep) migrated = true;
        return keep;
      });

    // Ensure Blogs link exists
    const hasBlogs = parsed.navLinks.some((link: any) => {
      const url = (link.url || '').toLowerCase();
      const label = (link.label || '').toLowerCase();
      return url.includes('/blogs') || label.includes('blog');
    });
    if (!hasBlogs) {
      parsed.navLinks.push({ id: 15, label: 'Blogs', url: '/blogs', enabled: true });
      migrated = true;
    }
  }

  // Auto-migrate footer columns to contain default page content
  if (parsed.footerColumns && Array.isArray(parsed.footerColumns)) {
    parsed.footerColumns = parsed.footerColumns.map((col: any) => ({
      ...col,
      links: (col.links || []).map((link: any) => {
        const defaultCol = defaults.footerColumns.find(c => c.title === col.title);
        const defaultLink = defaultCol?.links.find(l => l.id === link.id);
        if (defaultLink && link.customPageContent === undefined) {
          return { ...link, customPageContent: defaultLink.customPageContent };
        }
        return link;
      })
    }));
  }

  // Auto-migrate branding to Gazi Sports 24 if it was previously Tamim Global or Sports Core
  if (parsed.branding) {
    const storeName = parsed.branding.storeName || '';
    if (storeName === 'Tamim Global' || storeName === 'Sports Core' || storeName === 'SportScoreX' || storeName === 'Gazi Sports') {
      parsed.branding.footerDescription = 'Gazi Sports 24 means power, play, and joy. Find Gym Equipment, Sports Items, and Kids Sports Products for the whole family.';
      parsed.branding.copyrightText = '© 2026 Gazi Sports 24. All rights reserved.';
    }
  }

  // Auto-migrate single middle banner to middleBanners array
  if (parsed.middleBannerImage && (!parsed.middleBanners || !Array.isArray(parsed.middleBanners) || parsed.middleBanners.length === 0)) {
    parsed.middleBanners = [
      {
        id: 'mb-migrated',
        image: parsed.middleBannerImage,
        link: parsed.middleBannerLink || '',
        enabled: parsed.middleBannerEnabled !== undefined ? parsed.middleBannerEnabled : true
      }
    ];
  }

  return parsed;
}

// In-memory cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;
let _cacheTimestamp: number = 0;

function loadConfig(): StorefrontConfig {
  // Return in-memory cache if still fresh
  if (_config && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS) return _config;
  // Return stale cache while API fetch is in progress (avoids blank screen)
  if (_config) return _config;
  _config = getDefaultConfig();
  return _config;
}

function saveConfig(config: StorefrontConfig): void {
  _config = config;
  _cacheTimestamp = Date.now();
  // Notify all listeners
  _listeners.forEach(fn => fn());
}

// ============================================================
// BACKEND SYNC AND UTILITIES
// ============================================================

const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE = isLocalDev
  ? `${window.location.protocol}//${window.location.hostname}:5000/api/v1`
  : 'https://api.gazisports24.com/api/v1';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Track whether at least one backend sync has completed
let _synced = false;

async function syncWithBackend() {
  // Skip fetch if cache is still fresh (within TTL)
  if (_config && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS) {
    _synced = true;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/settings/storefront`);
    if (response.ok) {
      const res = await response.json();
      if (res.status === 'success' && res.data) {
        let serverConfig = res.data;
        serverConfig = migrateConfig(serverConfig);

        // Merge with current in-memory config to keep any loaded products/state
        const current = _config || getDefaultConfig();
        serverConfig = {
          ...current,
          ...serverConfig,
          products: (serverConfig.products && serverConfig.products.length > 0) ? serverConfig.products : current.products,
          contactInfo: { ...current.contactInfo, ...serverConfig.contactInfo },
          branding: { ...current.branding, ...serverConfig.branding },
          delivery: { ...current.delivery, ...serverConfig.delivery },
          newsletter: { ...current.newsletter, ...serverConfig.newsletter },
        };

        _config = serverConfig;
        _cacheTimestamp = Date.now();
        _synced = true;
        _listeners.forEach(fn => fn());
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to sync storefront config from backend — using cached defaults:', err);
    _synced = true; // still mark ready so UI doesn't stay blank forever
    _listeners.forEach(fn => fn()); // notify listeners even on failure
  }
}


// ============================================================
// PUBLIC API
// ============================================================

/** Get the full config */
export function getStorefrontConfig(): StorefrontConfig {
  return loadConfig();
}

/** Update the full config */
export function setStorefrontConfig(config: StorefrontConfig): void {
  saveConfig(config);
  fetch(`${API_BASE}/settings/storefront`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(config),
  }).catch(e => console.warn("Failed to save config to backend:", e));
}

/** Update the full config locally only (does not PUT to backend) */
export function setStorefrontConfigLocally(config: StorefrontConfig): void {
  saveConfig(config);
}

/** Update a specific section of the config */
export function updateStorefrontConfig<K extends keyof StorefrontConfig>(
  key: K,
  value: StorefrontConfig[K]
): void {
  const config = loadConfig();
  const newConfig = { ...config, [key]: value };
  saveConfig(newConfig);
  fetch(`${API_BASE}/settings/storefront`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(newConfig),
  }).catch(e => console.warn("Failed to save config to backend:", e));
}

/** Subscribe to config changes. Returns unsubscribe function. */
export function subscribeToConfig(listener: () => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter(fn => fn !== listener);
  };
}

/** Reset config to defaults */
export function resetStorefrontConfig(): void {
  _config = null;
  _cacheTimestamp = 0;
  _listeners.forEach(fn => fn());
  fetch(`${API_BASE}/settings/storefront`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(getDefaultConfig()),
  }).catch(e => console.warn('Failed to reset config on backend:', e));
}

// ============================================================
// REACT HOOK
// ============================================================

import { useState as useStateReact, useEffect as useEffectReact } from 'react';

/** React hook to read and reactively update storefront config */
export function useStorefrontConfig(): [
  StorefrontConfig, 
  (config: StorefrontConfig | ((prev: StorefrontConfig) => StorefrontConfig)) => void, 
  boolean
] {
  const [config, setConfigState] = useStateReact<StorefrontConfig>(() => loadConfig());
  const [configReady, setConfigReady] = useStateReact<boolean>(() => _synced);

  useEffectReact(() => {
    // One-time cleanup: remove stale localStorage config from older versions
    try { localStorage.removeItem(STORAGE_KEY); } catch {}

    syncWithBackend();
    const unsubscribe = subscribeToConfig(() => {
      setConfigState({ ...loadConfig() });
      setConfigReady(_synced);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const setConfig = (newConfig: StorefrontConfig | ((prev: StorefrontConfig) => StorefrontConfig)) => {
    const nextConfig = typeof newConfig === 'function' ? newConfig(loadConfig()) : newConfig;
    saveConfig(nextConfig);
    fetch(`${API_BASE}/settings/storefront`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(nextConfig),
    }).catch(e => console.warn("Failed to save config to backend:", e));
  };

  return [config, setConfig, configReady];
}

/** React hook for a specific config section */
export function useStorefrontSection<K extends keyof StorefrontConfig>(key: K): [StorefrontConfig[K], (value: StorefrontConfig[K]) => void] {
  const [config, setConfig] = useStorefrontConfig();

  const setValue = (value: StorefrontConfig[K]) => {
    setConfig({ ...config, [key]: value });
  };

  return [config[key], setValue];
}
