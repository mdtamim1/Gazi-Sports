import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';
import { SEOMeta } from '../components/layout/SEOMeta';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 20px',
      color: 'var(--sf-text-primary)'
    }}>
      <SEOMeta title="404 - Page Not Found" description="The page you are looking for does not exist." />
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.1)',
        color: '#ef4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <AlertCircle size={40} />
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>404 - Page Not Found</h1>
      <p style={{ color: 'var(--sf-text-secondary)', maxWidth: '420px', marginBottom: '24px', lineHeight: 1.6 }}>
        The page you are looking for doesn't exist, has been removed, or is currently unavailable.
      </p>
      <Link 
        to="/" 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: 'var(--sf-accent, #16a34a)',
          color: '#ffffff',
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <Home size={18} />
        Back to Home
      </Link>
    </div>
  );
}
