import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

// Auth Provider & Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { setStorefrontConfigLocally, getStorefrontConfig } from './store/storefrontConfig';
import { fetchProductsFromBackend } from './services/api';

// Full-screen fallback for initial app load / auth check only
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#0a0e1a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid rgba(99, 102, 241, 0.2)',
      borderTopColor: '#6366f1',
      borderRadius: '50%',
      animation: 'rotate 1s linear infinite'
    }} />
    <style>{`
      @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Lazy Loaded Admin Components (Keeps initial storefront bundle super light for fast Google load)
const Login = lazy(() => import('./features/auth/Login'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Orders = lazy(() => import('./features/orders/Orders'));
const Products = lazy(() => import('./features/products/Products'));
const Marketing = lazy(() => import('./features/marketing/Marketing'));
const Employees = lazy(() => import('./features/employees/Employees'));
const StorefrontManager = lazy(() => import('./features/storefront-manager/StorefrontManager'));
const RegisterEmployee = lazy(() => import('./features/employees/RegisterEmployee'));
const SecurityLogs = lazy(() => import('./features/security/SecurityLogs'));
const Inbox = lazy(() => import('./features/chats/Inbox'));
const BlogManager = lazy(() => import('./features/blogs/BlogManager'));
const EventsManager = lazy(() => import('./features/marketing/EventsManager'));

import StorefrontLayout from './storefront/StorefrontLayout';
import StorefrontHome from './storefront/StorefrontHome';

// Lazy Loaded Storefront Sub-Pages (Keeps initial Google entrance load lightning fast)
const ProductDetails = lazy(() => import('./storefront/ProductDetails'));
const Checkout = lazy(() => import('./storefront/Checkout'));
const CollectionPage = lazy(() => import('./storefront/CollectionPage'));
const CustomPage = lazy(() => import('./storefront/CustomPage'));
const CustomerAccount = lazy(() => import('./storefront/CustomerAccount'));
const CampaignPage = lazy(() => import('./storefront/CampaignPage'));
const PrivacyPolicy = lazy(() => import('./storefront/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./storefront/TermsOfService'));
const AboutUs = lazy(() => import('./storefront/AboutUs'));
const BlogList = lazy(() => import('./storefront/BlogList'));
const BlogDetails = lazy(() => import('./storefront/BlogDetails'));
const EventsPage = lazy(() => import('./storefront/EventsPage'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ PERFORMANCE FIX: Background prefetch all admin JS chunks.
// Called once after AdminLayout mounts. Each chunk is downloaded silently
// so every sidebar link click after this is INSTANT (no download delay).
// Staggered 300ms apart to avoid saturating the network.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const prefetchAdminChunks = () => {
  const chunks = [
    () => import('./features/orders/Orders'),
    () => import('./features/products/Products'),
    () => import('./features/marketing/Marketing'),
    () => import('./features/employees/Employees'),
    () => import('./features/storefront-manager/StorefrontManager'),
    () => import('./features/chats/Inbox'),
    () => import('./features/blogs/BlogManager'),
    () => import('./features/marketing/EventsManager'),
    () => import('./features/security/SecurityLogs'),
  ];
  chunks.forEach((load, i) => {
    setTimeout(() => { load().catch(() => {}); }, i * 300);
  });
};

// ✅ Tiny content-area spinner — sidebar stays fully visible during section transitions
const SectionSpinner = () => (
  <div style={{
    display: 'flex',
    width: '100%',
    height: 'calc(100vh - 120px)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '14px',
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid rgba(99, 102, 241, 0.12)',
      borderTopColor: '#6366f1',
      borderRadius: '50%',
      animation: 'sectionSpin 0.65s linear infinite',
    }} />
    <span style={{ color: 'rgba(148,163,184,0.45)', fontSize: '12px', letterSpacing: '0.06em' }}>Loading...</span>
    <style>{`@keyframes sectionSpin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Secret Admin Portal Wrapper (Renders Login if unauthenticated, AdminLayout if authenticated)
function SecretAdminPortal() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Login />;
  }

  return <AdminLayout />;
}

// ─── Inactivity Warning Modal ──────────────────────────────────────────────────
function InactivityWarningModal({ remaining, onStay, onLogout }: {
  remaining: number;
  onStay: () => void;
  onLogout: () => void;
}) {
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')} মিনিট`
    : `${secs} সেকেন্ড`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeInOverlay 0.2s ease',
    }}>
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpModal  { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulseRed      { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
      <div style={{
        background: 'linear-gradient(145deg, #0f1623 0%, #161d2e 100%)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '20px',
        padding: '40px 44px',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(239,68,68,0.1)',
        animation: 'slideUpModal 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        textAlign: 'center',
      }}>
        {/* Warning icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)',
          border: '2px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          animation: 'pulseRed 2s ease infinite',
        }}>
          <span style={{ fontSize: '28px' }}>⏱</span>
        </div>

        <h2 style={{
          fontSize: '20px', fontWeight: 700,
          color: '#f1f5f9', marginBottom: '12px', lineHeight: 1.3,
        }}>
          Session Timeout Warning
        </h2>

        <p style={{
          fontSize: '14px', color: '#94a3b8', marginBottom: '8px', lineHeight: 1.6,
        }}>
          দীর্ঘ নিষ্ক্রিয়তার কারণে আপনাকে স্বয়ংক্রিয়ভাবে
          Logout করা হবে।
        </p>

        {/* Countdown */}
        <div style={{
          fontSize: '32px', fontWeight: 800,
          color: remaining <= 30 ? '#ef4444' : '#f59e0b',
          marginBottom: '28px',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          transition: 'color 0.3s',
        }}>
          {timeStr}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onStay}
            style={{
              flex: 1, padding: '12px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'; }}
          >
            ✓ Logged In থাকো
          </button>
          <button
            onClick={onLogout}
            style={{
              flex: 1, padding: '12px 20px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              color: '#f87171', fontWeight: 600, fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
  const { resetActivity, showInactivityWarning, remainingSeconds, logout } = useAuth();

  // ✅ AUTO-LOGOUT: Global activity listeners
  // Any of these events resets the 30-minute inactivity timer
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;
    const handle = () => resetActivity();
    events.forEach(ev => window.addEventListener(ev, handle, { passive: true }));
    return () => events.forEach(ev => window.removeEventListener(ev, handle));
  }, [resetActivity]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ PERFORMANCE: After Dashboard renders (800ms delay), prefetch all other
  // admin section bundles in the background. Second visit to any section = instant.
  useEffect(() => {
    const t = setTimeout(prefetchAdminChunks, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      {/* Backdrop overlay for mobile drawer view */}
      <div className="sidebar-backdrop" onClick={() => setSidebarCollapsed(true)} />
      
      <div className="app-main">
        <TopBar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <main className="app-content">
          {/* ✅ SectionSpinner: sidebar always visible, only content area shows brief spinner on FIRST visit */}
          <Suspense fallback={<SectionSpinner />}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="employees" element={<Employees />} />
              <Route path="storefront-manager" element={<StorefrontManager />} />
              <Route path="chats" element={<Inbox />} />
              <Route path="blogs" element={<BlogManager />} />
              <Route path="events" element={<EventsManager />} />
              <Route path="security" element={<SecurityLogs />} />
              <Route path="*" element={<Navigate to="/firoz-84" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* ✅ AUTO-LOGOUT WARNING MODAL */}
      {showInactivityWarning && (
        <InactivityWarningModal
          remaining={remainingSeconds}
          onStay={resetActivity}
          onLogout={logout}
        />
      )}
    </div>
  );
}

const NotFound = lazy(() => import('./storefront/NotFound'));

export default function App() {
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const dbProducts = await fetchProductsFromBackend();
        if (dbProducts !== null) {
          const currentConfig = getStorefrontConfig();
          setStorefrontConfigLocally({ ...currentConfig, products: dbProducts });
        }
      } catch (e) {
        console.error('Failed to load storefront products:', e);
      }
    };
    loadProducts();
  }, []);

  const isSubdomainAdmin = window.location.hostname.startsWith('admin.');

  if (isSubdomainAdmin) {
    return (
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Employee Registration */}
            <Route path="/register-employee" element={<RegisterEmployee />} />

            {/* Secret Admin Portal */}
            <Route path="/firoz-84/*" element={<SecretAdminPortal />} />
            <Route path="/firoz-84" element={<SecretAdminPortal />} />

            {/* Catch-all redirect to Secret Admin dashboard */}
            <Route path="*" element={<Navigate to="/firoz-84" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Employee Registration (via Invitation) */}
            <Route path="/register-employee" element={<RegisterEmployee />} />

            {/* Customer-Facing Storefront */}
            <Route path="/" element={<StorefrontLayout />}>
              <Route index element={<StorefrontHome />} />
              <Route path="product/:id" element={<ProductDetails />} />
              <Route path="collection/:slug" element={<CollectionPage />} />
              <Route path="page/:id" element={<CustomPage />} />
              <Route path="campaign/:id" element={<CampaignPage />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="account" element={<CustomerAccount />} />
              <Route path="blogs" element={<BlogList />} />
              <Route path="blog/:slug" element={<BlogDetails />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="terms-of-service" element={<TermsOfService />} />
              <Route path="about-us" element={<AboutUs />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            
            {/* Secret Admin Portal & Panel */}
            <Route path="/firoz-84/*" element={<SecretAdminPortal />} />
            <Route path="/firoz-84" element={<SecretAdminPortal />} />

            {/* Standalone Full-Screen 404 Security Pages */}
            <Route path="/admin/*" element={<NotFound />} />
            <Route path="/admin" element={<NotFound />} />
            <Route path="/login" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}
