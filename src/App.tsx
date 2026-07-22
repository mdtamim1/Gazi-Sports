import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

// Auth Provider & Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { useStorefrontConfig, setStorefrontConfigLocally, getStorefrontConfig } from './store/storefrontConfig';
import { fetchProductsFromBackend } from './services/api';

// Loading Fallback Spinner
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

function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      {/* Backdrop overlay for mobile drawer view */}
      <div className="sidebar-backdrop" onClick={() => setSidebarCollapsed(true)} />
      
      <div className="app-main">
        <TopBar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <main className="app-content">
          <Suspense fallback={<LoadingFallback />}>
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
    </div>
  );
}

const NotFound = lazy(() => import('./storefront/NotFound'));

export default function App() {
  const [config] = useStorefrontConfig();

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

            {/* Explicit 404 for old admin & login URLs */}
            <Route path="/admin/*" element={<StorefrontLayout />}><Route path="*" element={<NotFound />} /></Route>
            <Route path="/admin" element={<StorefrontLayout />}><Route path="*" element={<NotFound />} /></Route>
            <Route path="/login" element={<StorefrontLayout />}><Route path="*" element={<NotFound />} /></Route>
          </Routes>
        </Suspense>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}
