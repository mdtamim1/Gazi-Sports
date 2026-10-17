import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatar?: string;
  permissions?: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auto-logout configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes → hard logout
const INACTIVITY_WARNING_MS = 28 * 60 * 1000;  // 28 minutes → show warning modal
const ACTIVITY_STORAGE_KEY  = 'admin_last_activity';
const CHECK_INTERVAL_MS     = 30 * 1000;        // check every 30 seconds

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  showInactivityWarning: boolean;
  remainingSeconds: number;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  resetActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Restore session from localStorage ───────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    const storedUser  = localStorage.getItem('admin_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setLoading(false);
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    intervalRef.current  = null;
    countdownRef.current = null;
    setShowInactivityWarning(false);
    setToken(null);
    setUser(null);
  }, []);

  // ─── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback((newToken: string, newUser: UserProfile) => {
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(newUser));
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    setToken(newToken);
    setUser(newUser);
    setShowInactivityWarning(false);
  }, []);

  // ─── Start warning countdown (2 minutes) ─────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (countdownRef.current) return; // already running
    const warningMs = INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS; // 2 min
    const expiry = Date.now() + warningMs;
    setRemainingSeconds(Math.round(warningMs / 1000));

    countdownRef.current = setInterval(() => {
      const secs = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setRemainingSeconds(secs);
      if (secs <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 1000);
  }, []);

  // ─── Reset last-activity timestamp ───────────────────────────────────────────
  const resetActivity = useCallback(() => {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    setShowInactivityWarning(prev => {
      if (prev) {
        // Dismiss warning and stop countdown
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
        setRemainingSeconds(Math.round((INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS) / 1000));
        return false;
      }
      return false;
    });
  }, []);

  // ─── Inactivity checker (runs every 30 seconds while logged in) ───────────────
  useEffect(() => {
    if (!user) {
      if (intervalRef.current)  { clearInterval(intervalRef.current);  intervalRef.current  = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      return;
    }

    // Ensure activity key is initialised
    if (!localStorage.getItem(ACTIVITY_STORAGE_KEY)) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    }

    intervalRef.current = setInterval(() => {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY) || Date.now());
      const idleMs = Date.now() - lastActivity;

      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        // Hard logout after 30 min
        logout();
      } else if (idleMs >= INACTIVITY_WARNING_MS) {
        // Show warning at 28 min
        setShowInactivityWarning(prev => {
          if (!prev) startCountdown();
          return true;
        });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current)  { clearInterval(intervalRef.current);  intervalRef.current  = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
  }, [user, logout, startCountdown]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      showInactivityWarning,
      remainingSeconds,
      login,
      logout,
      resetActivity,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
