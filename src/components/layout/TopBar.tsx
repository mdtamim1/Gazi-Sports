import { Search, Moon, Sun, Menu, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);

  // Theme Sync on Mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') || 'dark';
    setDarkMode(savedTheme === 'dark');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const nextVal = !darkMode;
    setDarkMode(nextVal);
    if (nextVal) {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('admin-theme', 'dark');
    } else {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('admin-theme', 'light');
    }
  };

  return (
    <header className="topbar">
      <button className="topbar-toggle" onClick={onMenuClick}>
        <Menu size={18} />
      </button>

      <div className="topbar-search">
        <Search className="topbar-search-icon" size={16} />
        <input
          className="topbar-search-input"
          type="text"
          placeholder="Search orders, customers, products..."
        />
        <span className="topbar-search-shortcut">⌘K</span>
      </div>

      <div className="topbar-actions" style={{ position: 'relative' }}>
        <div className="live-indicator">
          <div className="live-dot" />
          <span>Live</span>
        </div>

        <div className="topbar-divider" />

        {/* THEME TOGGLE BUTTON */}
        <button
          className="topbar-action-btn"
          title="Toggle theme"
          onClick={toggleTheme}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* LOGOUT BUTTON */}
        <button
          className="topbar-action-btn"
          title="Logout"
          onClick={logout}
          style={{ color: 'var(--color-danger, #ef4444)' }}
        >
          <LogOut size={18} />
        </button>

        <div className="topbar-divider" />

        <Link to={(user?.role === 'Super Admin' || user?.role === 'Admin' || user?.permissions?.includes('employees')) ? '/admin/employees' : '/admin'} style={{ textDecoration: 'none', color: 'inherit' }} className="topbar-profile">
          <div className="topbar-profile-avatar">
            {user?.avatar || (user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SA')}
          </div>
          <div className="topbar-profile-info">
            <span className="topbar-profile-name">{user?.name || 'Super Admin'}</span>
            <span className="topbar-profile-role">{user?.role || 'Full Access'}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
