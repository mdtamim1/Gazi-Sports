import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { SEOMeta } from '../components/layout/SEOMeta';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#090d16',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      overflow: 'hidden'
    }}>
      <SEOMeta title="404 - Page Not Found" description="The page you are looking for does not exist." />
      
      {/* Background Radial Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(9, 13, 22, 0) 70%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: 'rgba(17, 24, 39, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '48px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Animated 404 Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)'
        }}>
          <ShieldAlert size={36} />
        </div>

        {/* 404 Number Badge */}
        <div style={{
          fontSize: '4.5rem',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #ffffff 0%, #9ca3af 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '12px'
        }}>
          404
        </div>

        <h1 style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '10px',
          letterSpacing: '-0.01em'
        }}>
          Page Not Found
        </h1>

        <p style={{
          color: '#9ca3af',
          fontSize: '0.92rem',
          lineHeight: 1.6,
          marginBottom: '32px'
        }}>
          The page you requested could not be found, has been removed, or you do not have authorization to view it.
        </p>

        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box'
          }}
        >
          <ArrowLeft size={18} />
          Return to Homepage
        </Link>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '24px',
        color: '#4b5563',
        fontSize: '0.8rem'
      }}>
        © {new Date().getFullYear()} Gazi Sports 24. All rights reserved.
      </div>
    </div>
  );
}
