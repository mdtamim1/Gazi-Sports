import { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Store,
  Megaphone, UserCog, MessageSquare, BookOpen,
  ChevronLeft, ChevronRight, Trophy, ShieldAlert
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { fetchOrdersFromBackend } from '../../services/api';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}


export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    const loadActualOrdersCount = async () => {
      try {
        const dbOrders = await fetchOrdersFromBackend();
        if (dbOrders) {
          setOrdersCount(dbOrders.length);
        }
      } catch (e) {
        console.error('Failed to load actual orders count in sidebar:', e);
      }
    };

    loadActualOrdersCount();

    window.addEventListener('storage', loadActualOrdersCount);
    return () => window.removeEventListener('storage', loadActualOrdersCount);
  }, [location.pathname]);

  // Calculate unread customer messages
  const storedChats = localStorage.getItem('storefront_chats');
  let unreadChatsCount = 0;
  if (storedChats) {
    try {
      const chats = JSON.parse(storedChats);
      const unread = chats.filter((c: any) => c.sender === 'customer' && !c.read);
      unreadChatsCount = unread.length;
    } catch (e) {}
  }

  const navSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin', badge: '', badgeType: '' },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/admin/orders', badge: ordersCount > 0 ? String(ordersCount) : '', badgeType: 'warning' },
        { id: 'products', label: 'Products', icon: Package, path: '/admin/products', badge: '', badgeType: '' },
        { id: 'storefront', label: 'Storefront', icon: Store, path: '/admin/storefront-manager', badge: '', badgeType: '' },
        { id: 'blogs', label: 'Blog Posts', icon: BookOpen, path: '/admin/blogs', badge: '', badgeType: '' },
        { id: 'chats', label: 'Inbox', icon: MessageSquare, path: '/admin/chats', badge: unreadChatsCount > 0 ? String(unreadChatsCount) : '', badgeType: 'danger' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'marketing', label: 'Marketing', icon: Megaphone, path: '/admin/marketing', badge: '', badgeType: '' },
        { id: 'events', label: 'Events', icon: Trophy, path: '/admin/events', badge: '', badgeType: '' },
        { id: 'employees', label: 'Employees', icon: UserCog, path: '/admin/employees', badge: '', badgeType: '' },
        { id: 'security', label: 'Security Logs', icon: ShieldAlert, path: '/admin/security', badge: '', badgeType: '' },
      ],
    },
  ];

  // Filter sections and items based on permissions
  const filteredNavSections = navSections.map(section => {
    const items = section.items.filter(item => {
      // Super Admin and Admin role gets all access by default
      if (user?.role === 'Super Admin' || user?.role === 'Admin') return true;
      // Check if item.id is inside user permissions array
      return user?.permissions?.includes(item.id);
    });
    return { ...section, items };
  }).filter(section => section.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/favicon.png" alt="TG" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        {!collapsed && (
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Gazi Sports</span>
            <span className="sidebar-brand-tag">{user?.role || 'Super Admin'}</span>
          </div>
        )}
        <button
          className="topbar-toggle"
          onClick={onToggle}
          style={{ marginLeft: collapsed ? 0 : 'auto' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {filteredNavSections.map((section) => (
          <div key={section.title} className="sidebar-section">
            {!collapsed && (
              <div className="sidebar-section-title">{section.title}</div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/admin'
                ? location.pathname === '/admin' || location.pathname === '/admin/'
                : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="sidebar-item-icon" size={20} />
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`sidebar-item-badge ${item.badgeType}`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/admin/employees" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
          <div className="sidebar-user" style={{ width: '100%' }}>
            <div className="sidebar-user-avatar">
              {user?.avatar || (user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SA')}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name || 'Super Admin'}</div>
                <div className="sidebar-user-role">{user?.role || 'Full Access'}</div>
              </div>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}
