import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

// Auth Provider & Component
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './features/auth/Login';

// Admin Features
import Dashboard from './features/dashboard/Dashboard';
import Orders from './features/orders/Orders';
import Products from './features/products/Products';
import Marketing from './features/marketing/Marketing';
import Employees from './features/employees/Employees';
import StorefrontManager from './features/storefront-manager/StorefrontManager';
import RegisterEmployee from './features/employees/RegisterEmployee';
import SecurityLogs from './features/security/SecurityLogs';

// Storefront (Customer-facing)
import StorefrontLayout from './storefront/StorefrontLayout';
import StorefrontHome from './storefront/StorefrontHome';
import ProductDetails from './storefront/ProductDetails';
import Checkout from './storefront/Checkout';
import CollectionPage from './storefront/CollectionPage';
import CustomPage from './storefront/CustomPage';
import CustomerAccount from './storefront/CustomerAccount';
import CampaignPage from './storefront/CampaignPage';
import PrivacyPolicy from './storefront/PrivacyPolicy';
import TermsOfService from './storefront/TermsOfService';
import AboutUs from './storefront/AboutUs';
import Inbox from './features/chats/Inbox';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { useStorefrontConfig, setStorefrontConfigLocally, getStorefrontConfig } from './store/storefrontConfig';
import { fetchProductsFromBackend } from './services/api';

// Blog pages
import BlogList from './storefront/BlogList';
import BlogDetails from './storefront/BlogDetails';
import BlogManager from './features/blogs/BlogManager';

// Events
import EventsPage from './storefront/EventsPage';
import EventsManager from './features/marketing/EventsManager';

// Guard wrapper to protect admin routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        background: '#0a0e1a',
        alignItems: 'center',
        justifyContent: 'center'
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
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
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
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [config] = useStorefrontConfig();

  useEffect(() => {
    const loadProducts = async () => {
      const dbProducts = await fetchProductsFromBackend();
      if (dbProducts && dbProducts.length > 0) {
        const currentConfig = getStorefrontConfig();
        setStorefrontConfigLocally({ ...currentConfig, products: dbProducts });
      }
    };
    loadProducts();
  }, []);

  const isSubdomainAdmin = window.location.hostname === 'admin.tamimglobal.com' || window.location.hostname.startsWith('admin.');

  if (isSubdomainAdmin) {
    return (
      <AuthProvider>
        <Routes>
          {/* Login Portal */}
          <Route path="/login" element={<Login />} />

          {/* Employee Registration */}
          <Route path="/register-employee" element={<RegisterEmployee />} />

          {/* Admin Panel */}
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          } />

          {/* Catch-all redirect to Admin dashboard */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <Routes>
          {/* Login Portal */}
          <Route path="/login" element={<Login />} />

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
          </Route>
          
          {/* Admin Panel (all other routes protected under /admin) */}
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}
