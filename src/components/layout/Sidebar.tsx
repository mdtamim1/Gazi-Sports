import { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Store,
  Megaphone, UserCog, MessageSquare, BookOpen,
  ChevronLeft, ChevronRight, Trophy, ShieldAlert
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  // Calculate unread customer messages for Inbox
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  useEffect(() => {
    const calculateUnread = () => {
      const storedChats = localStorage.getItem('storefront_chats');
      if (storedChats) {
        try {
          const chats = JSON.parse(storedChats);
          const unread = chats.filter((c: any) => c.sender === 'customer' && !c.read);
          setUnreadChatsCount(unread.length);
        } catch (e) {
          setUnreadChatsCount(0);
        }
      }
    };

    calculateUnread();
    window.addEventListener('storage', calculateUnread);
    return () => window.removeEventListener('storage', calculateUnread);
  }, [location.pathname]);

  const navSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/firoz-84', badge: '', badgeType: '' },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/firoz-84/orders', badge: '', badgeType: '' },
        { id: 'products', label: 'Products', icon: Package, path: '/firoz-84/products', badge: '', badgeType: '' },
        { id: 'storefront', label: 'Storefront', icon: Store, path: '/firoz-84/storefront-manager', badge: '', badgeType: '' },
        { id: 'blogs', label: 'Blog Posts', icon: BookOpen, path: '/firoz-84/blogs', badge: '', badgeType: '' },
        { id: 'chats', label: 'Inbox', icon: MessageSquare, path: '/firoz-84/chats', badge: unreadChatsCount > 0 ? String(unreadChatsCount) : '', badgeType: 'danger' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'marketing', label: 'Marketing', icon: Megaphone, path: '/firoz-84/marketing', badge: '', badgeType: '' },
        { id: 'events', label: 'Events', icon: Trophy, path: '/firoz-84/events', badge: '', badgeType: '' },
        { id: 'employees', label: 'Employees', icon: UserCog, path: '/firoz-84/employees', badge: '', badgeType: '' },
        { id: 'security', label: 'Security Logs', icon: ShieldAlert, path: '/firoz-84/security', badge: '', badgeType: '' },
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
            <span className="sidebar-brand-name">Gazi Sports 24</span>
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
              const isActive = item.path === '/firoz-84'
                ? location.pathname === '/firoz-84' || location.pathname === '/firoz-84/'
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
        <Link to={(user?.role === 'Super Admin' || user?.role === 'Admin' || user?.permissions?.includes('employees')) ? '/firoz-84/employees' : '/firoz-84'} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
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
