import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'


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
