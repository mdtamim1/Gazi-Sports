import React, { useState, useEffect, useRef } from 'react';
import { fetchSpinWheelConfig, playSpinWheel } from '../services/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { Sparkles, X, Check, Copy, Flame, Trophy } from 'lucide-react';

interface WheelSlice {
  id: string;
  label: string;
  coupon_code: string;
  type: 'percentage' | 'fixed';
  value: number;
  weight: number;
  color: string;
}

interface SpinWheelConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  slices: WheelSlice[];
}

export const SpinWheelModal: React.FC = () => {
  const [config, setConfig] = useState<SpinWheelConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSlice, setWinningSlice] = useState<WheelSlice | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { customer } = useCustomerAuth();

  const handleClose = () => {
    sessionStorage.setItem('spin_wheel_shown', 'true');
    setIsOpen(false);
  };

  useEffect(() => {
    const handleManualOpen = () => setIsOpen(true);
    window.addEventListener('open-spin-wheel', handleManualOpen);
    return () => window.removeEventListener('open-spin-wheel', handleManualOpen);
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const json = await fetchSpinWheelConfig();
        if (json && json.status === 'success' && json.data && json.data.enabled) {
          setConfig(json.data);

          // Check if user already claimed coupon or if wheel popup was already shown in this session
          const claimed = localStorage.getItem('spin_wheel_claimed');
          const shownInSession = sessionStorage.getItem('spin_wheel_shown');
          if (!claimed && !shownInSession) {
            // Automatically open modal ONCE per browser session after 1.5 seconds
            const timer = setTimeout(() => {
              setIsOpen(true);
              sessionStorage.setItem('spin_wheel_shown', 'true');
            }, 1500);
            return () => clearTimeout(timer);
          }
        }
      } catch (e) {
        console.error('Failed to load spin wheel config:', e);
      }
    };
    loadConfig();
  }, []);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use High-DPI canvas (600x600) for ultra-crisp luxury text
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRingRadius = Math.min(centerX, centerY) - 8;
    const wheelRadius = outerRingRadius - 16;
    const slices = config!.slices;
    const sliceAngle = (2 * Math.PI) / slices.length;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Outer Gold Metallic Rim
    const rimGradient = ctx.createRadialGradient(centerX, centerY, wheelRadius, centerX, centerY, outerRingRadius);
    rimGradient.addColorStop(0, '#d97706');
    rimGradient.addColorStop(0.5, '#fbbf24');
    rimGradient.addColorStop(1, '#78350f');

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRingRadius, 0, 2 * Math.PI);
    ctx.fillStyle = rimGradient;
    ctx.fill();

    // 2. Draw Studded Lights around the Rim
    const studCount = slices.length * 4;
    for (let s = 0; s < studCount; s++) {
      const studAngle = (s * 2 * Math.PI) / studCount;
      const studX = centerX + (outerRingRadius - 8) * Math.cos(studAngle);
      const studY = centerY + (outerRingRadius - 8) * Math.sin(studAngle);

      ctx.beginPath();
      ctx.arc(studX, studY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 3. Draw Luxury Slices & Centered Text
    slices.forEach((slice, i) => {
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;

      // Draw Slice Sector
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, wheelRadius, startAngle, endAngle);
      ctx.closePath();

      // Fallback luxury colors if not assigned
      const defaultLuxuryColors = ['#7c3aed', '#059669', '#d97706', '#e11d48', '#2563eb', '#4f46e5'];
      ctx.fillStyle = slice.color || defaultLuxuryColors[i % defaultLuxuryColors.length];
      ctx.fill();

      // Divider Lines
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.stroke();

      // Draw Perfectly Centered Text (No overlap/clipping)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      // Dynamic font size scaling
      const fontSize = slice.label.length > 11 ? 16 : slice.label.length > 8 ? 19 : 22;
      ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      // Position centered nicely inside the slice sector
      ctx.fillText(slice.label, wheelRadius * 0.62, 0);
      ctx.restore();
    });

    // 4. Draw Center Cap Gold Base
    ctx.beginPath();
    ctx.arc(centerX, centerY, 48, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();
  };

  // Draw wheel on canvas when config is loaded
  useEffect(() => {
    if (!config || !config.slices || config.slices.length === 0 || !canvasRef.current) return;
    drawWheel();
  }, [config, isOpen]);

  const handleSpin = async () => {
    if (isSpinning || !config || config.slices.length === 0) return;
    setIsSpinning(true);

    try {
      const res = await playSpinWheel(customer?.email);
      if (res && res.status === 'success' && res.data) {
        const sliceCount = config.slices.length;
        const targetIndex = res.winningIndex !== undefined ? res.winningIndex : 0;

        // Angle calculation
        const sliceAngleDeg = 360 / sliceCount;
        // Target angle to center the pointer (at top 270deg / 0deg pointer)
        const sliceCenterAngle = targetIndex * sliceAngleDeg + sliceAngleDeg / 2;
        const targetDegrees = 360 - sliceCenterAngle;

        // 6 full rotations (2160 deg) + target angle
        const finalRotation = rotationDeg + 2160 + (targetDegrees - (rotationDeg % 360));
        setRotationDeg(finalRotation);

        setTimeout(() => {
          setIsSpinning(false);
          setWinningSlice(res.data);

          const claimData = JSON.stringify({
            code: res.data.coupon_code,
            label: res.data.label,
            timestamp: Date.now()
          });

          // Save claim in localStorage (global & customer-specific)
          localStorage.setItem('spin_wheel_claimed', claimData);
          if (customer && customer.email) {
            localStorage.setItem(`spin_wheel_claimed_${customer.email.trim().toLowerCase()}`, claimData);
          }
        }, 4600);
      } else {
        setIsSpinning(false);
        alert(res?.message || 'আপনি এই অ্যাকাউন্ট দিয়ে ইতিপূর্বে ১ বার স্পিন হুইল ব্যবহার করেছেন। প্রতি অ্যাকাউন্টে ১ বারই স্পিন প্রযোজ্য।');
      }
    } catch (e) {
      setIsSpinning(false);
      console.error(e);
      alert('একটি সমস্যা হয়েছে। দয়া করে একটু পর আবার চেষ্টা করুন।');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!config || !config.enabled) return null;

  return (
    <>
      {/* Floating Badge */}
      {!isOpen && !winningSlice && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 998,
            background: 'linear-gradient(135deg, #d97706 0%, #7c3aed 100%)',
            color: '#fff',
            border: '2px solid rgba(251, 191, 36, 0.6)',
            borderRadius: '50px',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(217, 119, 6, 0.6)',
            transition: 'all 0.3s ease',
            animation: 'pulse 2s infinite'
          }}
        >
          <Sparkles size={18} style={{ color: '#fbbf24' }} />
          <span>লটারি হুইল ঘুরান!</span>
          <Flame size={16} style={{ color: '#fbbf24' }} />
        </button>
      )}

      {/* Main Modal Backdrop */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(5, 5, 12, 0.86)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '460px',
              background: 'linear-gradient(145deg, rgba(20, 16, 42, 0.96), rgba(10, 8, 25, 0.98))',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(217, 119, 6, 0.3)',
              padding: '28px 24px',
              textAlign: 'center',
              color: '#fff',
              overflow: 'hidden'
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#cbd5e1',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>

            {/* Header Title */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                <Sparkles size={14} /> VIP FORTUNE WHEEL
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px 0', background: 'linear-gradient(135deg, #ffffff 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {config.title}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                {config.subtitle}
              </p>
            </div>

            {/* Winning Reveal Screen */}
            {winningSlice ? (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(251, 191, 36, 0.5)',
                  borderRadius: '18px',
                  padding: '24px 16px',
                  margin: '20px 0 10px 0',
                  animation: 'fadeIn 0.5s ease-out'
                }}
              >
                <Trophy size={48} style={{ color: '#fbbf24', margin: '0 auto 12px auto' }} />
                <h3 style={{ color: '#4ade80', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0' }}>
                  অভিনন্দন! আপনি জিতেছেন 🎉
                </h3>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', margin: '8px 0' }}>
                  {winningSlice.label}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '16px' }}>
                  অর্ডার করার সময় নিচের কুপন কোডটি ব্যবহার করে ডিসকাউন্ট উপভোগ করুন:
                </p>

                {/* Coupon Code Copy Box */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '2px dashed #fbbf24',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '2px' }}>
                    {winningSlice.coupon_code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(winningSlice.coupon_code)}
                    style={{
                      background: copied ? '#16a34a' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)'
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.5)'
                  }}
                >
                  শপিং করুন ও কুপন দাবি করুন 🛍️
                </button>
              </div>
            ) : (
              /* Wheel Spinner View */
              <div style={{ position: 'relative', margin: '20px auto 16px auto', width: '280px', height: '280px' }}>
                {/* Metallic Gold Pointer Arrow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    width: 0,
                    height: 0,
                    borderLeft: '15px solid transparent',
                    borderRight: '15px solid transparent',
                    borderTop: '26px solid #fbbf24',
                    filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.8))'
                  }}
                />

                {/* Rotating Wheel Canvas */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    transform: `rotate(${rotationDeg}deg)`,
                    transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    boxShadow: '0 0 35px rgba(251, 191, 36, 0.4)'
                  }}
                >
                  <canvas ref={canvasRef} width={600} height={600} style={{ width: '100%', height: '100%' }} />
                </div>

                {/* Spin Action Trigger Overlay Center */}
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                    color: '#fff',
                    border: '3px solid #ffffff',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 22
                  }}
                >
                  <Sparkles size={18} style={{ color: '#ffffff' }} />
                  <span>SPIN</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
