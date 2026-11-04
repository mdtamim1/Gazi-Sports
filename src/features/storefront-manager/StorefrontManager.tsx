import { useState, useEffect, useRef } from 'react';
import {
  Image, Megaphone, Video, Film, Grid3X3, ShoppingBag, Link2, Columns3,
  Palette, Award, Truck, RotateCcw, Plus, Trash2,
  ChevronUp, ChevronDown, Edit3, Eye, X, Check, Upload,
  CreditCard, Lock, AlertTriangle, Monitor, Smartphone, Volume2, VolumeX, Repeat, Play, Sparkles
} from 'lucide-react';
import {
  useStorefrontConfig,
  type StorefrontConfig,
  type BannerSlide,
  type AnnouncementItem,
  type CategoryConfig,
  type NavLinkItem,
  type FeatureBadge,
  type MiddleBannerConfig,
  DEFAULT_HERO_BANNER,
  resetStorefrontConfig,
  forceRefreshStorefrontConfig,
} from '../../store/storefrontConfig';
import { convertToWebP } from '../../utils/imageCdn';
import { uploadMediaToBackend } from '../../services/api';
import './storefront-manager.css';

// ============================================================
// TAB DEFINITIONS
// ============================================================
const TABS = [
  { id: 'banners', label: 'Banners & Promos', icon: Image },
  { id: 'categories', label: 'Categories', icon: Grid3X3 },
  { id: 'navigation', label: 'Navigation', icon: Link2 },
  { id: 'featured', label: 'Homepage Collections', icon: ShoppingBag },
  { id: 'footer', label: 'Footer', icon: Columns3 },
  { id: 'branding', label: 'Branding & Contact', icon: Palette },
  { id: 'badges', label: 'Feature Badges', icon: Award },
  { id: 'delivery', label: 'Delivery Settings', icon: Truck },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function StorefrontManager() {
  const [config, setConfig] = useStorefrontConfig();
  const [activeTab, setActiveTab] = useState<TabId>('banners');

  useEffect(() => {
    forceRefreshStorefrontConfig();
  }, []);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const updateConfig = <K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) => {
    setConfig({ ...config, [key]: value });
    showToast('Changes saved!');
  };

  const handleReset = () => {
    requirePassword(
      'Reset Storefront Defaults',
      'This will reset ALL storefront settings (banners, categories, navigation, branding, etc.) to factory defaults. This action is irreversible. Enter your admin password to continue.',
      () => {
        resetStorefrontConfig();
        showToast('Reset to defaults!');
      }
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">
            <span>Home</span>
            <span className="page-breadcrumb-sep">/</span>
            <span>Storefront Manager</span>
          </div>
          <h1 className="page-title">Storefront Customization</h1>
          <p className="page-subtitle">Manage every aspect of your customer-facing store from here</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleReset}>
            <RotateCcw size={16} /> Reset Defaults
          </button>
          <a href="/store" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Eye size={16} /> Preview Store
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sfm-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`sfm-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'banners' && (
        <>
          <BannersSection config={config} updateConfig={updateConfig} />
          <AnnouncementsSection config={config} updateConfig={updateConfig} />
        </>
      )}
      {activeTab === 'categories' && <CategoriesSection config={config} updateConfig={updateConfig} />}
      {activeTab === 'navigation' && <NavigationSection config={config} updateConfig={updateConfig} />}
      {activeTab === 'featured' && <FeaturedCollectionsSection config={config} updateConfig={updateConfig} />}
      {activeTab === 'footer' && <FooterSection config={config} updateConfig={updateConfig} />}
      {activeTab === 'branding' && <BrandingSection config={config} updateConfig={updateConfig} />}
      {activeTab === 'badges' && <BadgesSection config={config} updateConfig={updateConfig} />}
      {activeTab === 'delivery' && <DeliverySection config={config} updateConfig={updateConfig} />}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '12px 24px', borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.95)', color: '#fff',
          fontWeight: 600, fontSize: '14px',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'sfm-fadeIn 0.3s ease',
        }}>
          <Check size={16} /> {toast}
        </div>
      )}
      {/* Task 1: Password confirmation modal for destructive actions */}
      <PasswordConfirmModal />
    </div>
  );
}


// ============================================================
// PASSWORD CONFIRMATION MODAL (Task 1)
// ============================================================
const API_BASE_URL = (() => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? `${window.location.protocol}//${window.location.hostname}:5000/api/v1` : 'https://api.gazisports24.com/api/v1';
})();

interface PasswordModalState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

/** Shared state for the password modal — lifted to module level so any section can trigger it */
let _pwModalSetState: ((s: PasswordModalState | null) => void) | null = null;

/**
 * Call this to show a password confirmation dialog before a destructive action.
 * @param title   Modal title, e.g. "Delete Banner"
 * @param message Explanation shown below the title
 * @param onConfirm Callback run only after correct password is entered
 */
function requirePassword(title: string, message: string, onConfirm: () => void) {
  if (_pwModalSetState) {
    _pwModalSetState({ open: true, title, message, onConfirm });
  }
}

function PasswordConfirmModal() {
  const [state, setState] = useState<PasswordModalState | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register setter so requirePassword() can open the modal from anywhere (done in an effect to avoid render side-effect lint error)
  useEffect(() => {
    _pwModalSetState = setState;
    return () => { _pwModalSetState = null; };
  }, [setState]);

  const close = () => {
    setState(null);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('Please enter your password.'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE_URL}/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.valid) {
        state?.onConfirm();
        close();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch {
      setError('Failed to verify password. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!state?.open) return null;

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div className="modal-content" style={{ maxWidth: '420px', width: '90%', animation: 'scaleUp 0.2s ease' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
            <Lock size={18} /> {state.title}
          </div>
          <button className="modal-close" onClick={close}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{state.message}</p>
            </div>
            <div>
              <label className="sfm-label">Admin Password</label>
              <input
                className="sfm-input"
                type="password"
                autoFocus
                placeholder="Enter your admin panel password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
              />
              {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{error}</div>}
            </div>
          </div>
          <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={close} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading} style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
              {loading ? 'Verifying…' : 'Confirm Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// SHARED HELPERS
// ============================================================
interface SectionProps {
  config: StorefrontConfig;
  updateConfig: <K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <label className="sfm-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="sfm-toggle-slider" />
    </label>
  );
}

// ============================================================
// 1. BANNERS SECTION
// ============================================================
function BannersSection({ config, updateConfig }: SectionProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState('');
  const [editMiddleId, setEditMiddleId] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const heroBanner = config.heroBanner || DEFAULT_HERO_BANNER;
  const middleBanners = config.middleBanners || [];
  const publishedProducts = config.products.filter(p => p.published);
  const sampleTrending = config.trendingProductIds && config.trendingProductIds.length > 0
    ? publishedProducts.filter(p => config.trendingProductIds!.map(String).includes(String(p.id))).slice(0, 4)
    : publishedProducts.slice(0, 4);
  const sampleNewArrivals = config.newArrivalProductIds && config.newArrivalProductIds.length > 0
    ? publishedProducts.filter(p => config.newArrivalProductIds!.map(String).includes(String(p.id))).slice(0, 4)
    : publishedProducts.slice(0, 4);

  const updateHero = (field: string, value: any) => {
    updateConfig('heroBanner', { ...heroBanner, [field]: value });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Video file is too large! Please upload a video under 50MB.');
      return;
    }

    setVideoUploading(true);
    setVideoUploadError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await uploadMediaToBackend(base64, file.name);
        if (res.success && res.url) {
          updateHero('videoUrl', res.url);
          updateHero('mediaType', 'video');
          alert('Video uploaded successfully!');
        } else {
          setVideoUploadError(res.error || 'Failed to upload video');
          alert(res.error || 'Failed to upload video');
        }
        setVideoUploading(false);
      };
      reader.onerror = () => {
        setVideoUploading(false);
        setVideoUploadError('Error reading video file');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setVideoUploading(false);
      setVideoUploadError(err.message || 'Upload error');
    }
  };

  const updateMiddle = (id: string, field: keyof MiddleBannerConfig, value: any) => {
    updateConfig('middleBanners', middleBanners.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const addMiddleBanner = () => {
    const newId = 'mb-' + Date.now();
    updateConfig('middleBanners', [...middleBanners, {
      id: newId,
      image: '',
      link: '/collection/all',
      enabled: true,
    }]);
    setEditMiddleId(newId);
  };

  const removeMiddleBanner = (id: string) => {
    requirePassword(
      'Delete Middle Banner',
      'Are you sure you want to delete this promotional banner? Enter your admin password to confirm.',
      () => {
        updateConfig('middleBanners', middleBanners.filter(b => b.id !== id));
        if (editMiddleId === id) setEditMiddleId(null);
      }
    );
  };

  const moveMiddle = (id: string, dir: -1 | 1) => {
    const idx = middleBanners.findIndex(b => b.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === middleBanners.length - 1)) return;
    const newArr = [...middleBanners];
    [newArr[idx], newArr[idx + dir]] = [newArr[idx + dir], newArr[idx]];
    updateConfig('middleBanners', newArr);
  };

  return (
    <div className="sfm-banner-studio">
      {/* LEFT COLUMN: Clean Minimal Banner Controls */}
      <div className="sfm-banner-controls-col">
        {/* Main Hero Banner Setup */}
        <div className="sfm-card" style={{ border: '1.5px solid rgba(233, 43, 43, 0.3)', borderRadius: '12px' }}>
          <div className="sfm-card-header" style={{ paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <Film size={18} style={{ color: 'var(--sf-accent, #E92B2B)' }} />
                Homepage Hero Banner Setup
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Clean full-width banner: choose between an optimized static image or seamless video
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {heroBanner.enabled !== false ? 'Active' : 'Disabled'}
              </span>
              <Toggle checked={heroBanner.enabled !== false} onChange={(v) => updateHero('enabled', v)} />
            </div>
          </div>

          {/* Banner Media Mode Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <button
              type="button"
              className={`btn ${heroBanner.mediaType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => updateHero('mediaType', 'image')}
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}
            >
              <Image size={15} /> Static Image Banner
            </button>
            <button
              type="button"
              className={`btn ${heroBanner.mediaType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => updateHero('mediaType', 'video')}
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}
            >
              <Video size={15} /> Video Hero Banner
            </button>
          </div>

          {heroBanner.mediaType === 'video' ? (
            /* ---- VIDEO HERO BANNER SETTINGS ---- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Video File / URL Input */}
              <div>
                <label className="sfm-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>Video File or Direct URL *</span>
                  <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>⚡ 0ms instant stream</span>
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="sfm-input"
                    style={{ flex: 1, minWidth: '220px' }}
                    value={heroBanner.videoUrl || ''}
                    onChange={e => updateHero('videoUrl', e.target.value)}
                    placeholder="e.g. /uploads/media/banner.mp4 or https://..."
                  />
                  <label className="btn btn-secondary" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', height: '38px', boxSizing: 'border-box' }}>
                    <Upload size={14} /> {videoUploading ? 'Uploading...' : 'Upload MP4/WebM'}
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      style={{ display: 'none' }}
                      disabled={videoUploading}
                      onChange={handleVideoUpload}
                    />
                  </label>
                </div>
                {videoUploadError && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{videoUploadError}</div>}
              </div>

              {/* Poster / Fallback Image */}
              <div>
                <label className="sfm-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>Fast Fallback Poster Image</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Shown instantly before video frames start</span>
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="sfm-input"
                    style={{ flex: 1, minWidth: '220px' }}
                    value={heroBanner.posterImage || ''}
                    onChange={e => updateHero('posterImage', e.target.value)}
                    placeholder="e.g. /assets/main-banner.webp"
                  />
                  <label className="btn btn-secondary" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', height: '38px', boxSizing: 'border-box' }}>
                    <Upload size={14} /> Upload Poster
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const webp = await convertToWebP(file);
                            updateHero('posterImage', webp);
                          } catch {
                            alert('Failed to convert poster image.');
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Banner Click Link (Optional) */}
              <div>
                <label className="sfm-label" style={{ marginBottom: '6px' }}>Banner Redirect Link (Optional)</label>
                <input
                  className="sfm-input"
                  value={heroBanner.link || ''}
                  onChange={e => updateHero('link', e.target.value)}
                  placeholder="e.g. /collection/all or /collection/gym-equipment"
                />
              </div>

              {/* Video Controls & Display Effects Grid */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-secondary)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Video Controls & Effects
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {/* Mute Audio */}
                  <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Mute Audio</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Required for autoplay</div>
                    </div>
                    <Toggle checked={heroBanner.muted !== false} onChange={v => updateHero('muted', v)} />
                  </div>

                  {/* Loop Video */}
                  <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Continuous Loop</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Replay seamlessly</div>
                    </div>
                    <Toggle checked={heroBanner.loop !== false} onChange={v => updateHero('loop', v)} />
                  </div>

                  {/* Autoplay */}
                  <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Autoplay</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Auto-play on entry</div>
                    </div>
                    <Toggle checked={heroBanner.autoPlay !== false} onChange={v => updateHero('autoPlay', v)} />
                  </div>

                  {/* Edge Fading */}
                  <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Edge Fading</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Soft vignette effect</div>
                    </div>
                    <Toggle checked={Boolean(heroBanner.fadeEdges)} onChange={v => updateHero('fadeEdges', v)} />
                  </div>
                </div>

                {/* Dark Tint Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="sfm-label" style={{ margin: 0 }}>Dark Tint Overlay</label>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(233, 43, 43, 0.15)', color: 'var(--sf-accent, #E92B2B)' }}>
                      {heroBanner.overlayOpacity ?? 0}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={heroBanner.overlayOpacity ?? 0}
                    onChange={e => updateHero('overlayOpacity', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--sf-accent, #E92B2B)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    <span>0% (Crystal Clear)</span>
                    <span>40% (Balanced)</span>
                    <span>80% (Deep Dark)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ---- STATIC IMAGE HERO BANNER SETTINGS ---- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="sfm-label" style={{ marginBottom: '6px' }}>Banner Image URL or Upload *</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="sfm-input"
                    style={{ flex: 1, minWidth: '220px' }}
                    value={heroBanner.image || ''}
                    onChange={e => updateHero('image', e.target.value)}
                    placeholder="e.g. /assets/main-banner.webp or https://..."
                  />
                  <label className="btn btn-secondary" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', height: '38px', boxSizing: 'border-box' }}>
                    <Upload size={14} /> Upload Banner Image
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const webp = await convertToWebP(file);
                            updateHero('image', webp);
                          } catch {
                            alert('Failed to convert banner image.');
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Banner Click Link (Optional) */}
              <div>
                <label className="sfm-label" style={{ marginBottom: '6px' }}>Banner Redirect Link (Optional)</label>
                <input
                  className="sfm-input"
                  value={heroBanner.link || ''}
                  onChange={e => updateHero('link', e.target.value)}
                  placeholder="e.g. /collection/all or /collection/gym-equipment"
                />
              </div>

              {/* Effects: Edge Fading & Dark Tint Overlay */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-secondary)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Edge Fading</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Soft vignette transition at top & bottom</div>
                  </div>
                  <Toggle checked={Boolean(heroBanner.fadeEdges)} onChange={v => updateHero('fadeEdges', v)} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="sfm-label" style={{ margin: 0 }}>Dark Tint Overlay</label>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(233, 43, 43, 0.15)', color: 'var(--sf-accent, #E92B2B)' }}>
                      {heroBanner.overlayOpacity ?? 0}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={heroBanner.overlayOpacity ?? 0}
                    onChange={e => updateHero('overlayOpacity', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--sf-accent, #E92B2B)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    <span>0% (Full Brightness)</span>
                    <span>40% (Medium Tint)</span>
                    <span>80% (Deep Dark)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Middle Promotional Banners */}
        <div className="sfm-card">
          <div className="sfm-card-header" style={{ paddingBottom: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Middle Promo Banners</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Promotional banners displayed above the footer</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={addMiddleBanner}>
              <Plus size={14} /> Add Promo Banner
            </button>
          </div>

          <div className="sfm-item-list">
            {middleBanners.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                No middle promo banners added. Click "+ Add Promo Banner" to add one.
              </div>
            ) : (
              middleBanners.map((banner, idx) => (
                <div key={banner.id}>
                  <div className="sfm-item">
                    <div className="sfm-item-number">{idx + 1}</div>
                    <div style={{ width: 56, height: 34, borderRadius: 6, flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {banner.image && <img src={banner.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div className="sfm-item-content">
                      <div className="sfm-item-title">{banner.link || 'No redirect link'}</div>
                      <div className="sfm-item-meta">{banner.image ? 'Custom image' : 'No image set'}</div>
                    </div>
                    <Toggle checked={banner.enabled} onChange={(v) => updateMiddle(banner.id, 'enabled', v)} />
                    <div className="sfm-actions">
                      <button className="sfm-btn-icon" onClick={() => moveMiddle(banner.id, -1)} title="Move up"><ChevronUp size={14} /></button>
                      <button className="sfm-btn-icon" onClick={() => moveMiddle(banner.id, 1)} title="Move down"><ChevronDown size={14} /></button>
                      <button className="sfm-btn-icon" onClick={() => setEditMiddleId(editMiddleId === banner.id ? null : banner.id)} title="Edit"><Edit3 size={14} /></button>
                      <button className="sfm-btn-icon danger" onClick={() => removeMiddleBanner(banner.id)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {editMiddleId === banner.id && (
                    <div className="sfm-expand">
                      <div className="sfm-expand-body">
                        <div className="sfm-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                          <div className="sfm-form-group">
                            <label className="sfm-label">Redirect Link (Optional)</label>
                            <input 
                              className="sfm-input" 
                              value={banner.link || ''} 
                              onChange={e => updateMiddle(banner.id, 'link', e.target.value)} 
                              placeholder="/collection/all"
                            />
                          </div>
                          <div className="sfm-form-group">
                            <label className="sfm-label">Banner Image URL / Upload</label>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                              <input 
                                className="sfm-input" 
                                style={{ flex: 1, minWidth: '200px' }} 
                                value={banner.image || ''} 
                                onChange={e => updateMiddle(banner.id, 'image', e.target.value)} 
                                placeholder="https://example.com/banner.webp" 
                              />
                              <label className="btn btn-secondary" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', height: '38px', boxSizing: 'border-box' }}>
                                <Upload size={14} /> Upload Image
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  style={{ display: 'none' }} 
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const webpBase64 = await convertToWebP(file);
                                        updateMiddle(banner.id, 'image', webpBase64);
                                      } catch {
                                        alert('Failed to convert image.');
                                      }
                                    }
                                  }} 
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: LIVE STOREFRONT WEBSITE PREVIEW */}
      <div className="sfm-live-preview-panel">
        <div className="sfm-preview-browser-bar">
          <div className="sfm-preview-window-dots">
            <span className="sfm-preview-window-dot sfm-dot-red" />
            <span className="sfm-preview-window-dot sfm-dot-yellow" />
            <span className="sfm-preview-window-dot sfm-dot-green" />
          </div>

          <div className="sfm-preview-address-bar">
            <span>🔒</span>
            <span>gazisports24.com</span>
            <span style={{ color: '#10b981', marginLeft: '6px', fontSize: '9px', fontWeight: 700 }}>● LIVE</span>
          </div>

          <div className="sfm-preview-viewport-toggle">
            <button
              type="button"
              className={`sfm-preview-viewport-btn ${viewportMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setViewportMode('desktop')}
              title="Desktop View"
            >
              <Monitor size={12} /> PC
            </button>
            <button
              type="button"
              className={`sfm-preview-viewport-btn ${viewportMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setViewportMode('mobile')}
              title="Mobile View"
            >
              <Smartphone size={12} /> Mobile
            </button>
          </div>
        </div>

        {/* Live Storefront Mockup Screen */}
        <div className={`sfm-preview-screen ${viewportMode === 'mobile' ? 'mobile' : ''}`}>
          {/* Simulated Header */}
          <div className="sfm-preview-store-header">
            {viewportMode === 'desktop' && (
              <div className="sfm-preview-nav-links">
                <span>Home</span>
                <span>Shop</span>
                <span>Blogs</span>
              </div>
            )}
            <div className="sfm-preview-logo">
              GAZI <span>SPORTS 24</span>
            </div>
            {viewportMode === 'desktop' ? (
              <div className="sfm-preview-nav-links">
                <span>Contact</span>
                <span>Events</span>
                <span>🛒 Cart (0)</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem' }}>☰</div>
            )}
          </div>

          {/* Simulated LIVE HERO BANNER */}
          {heroBanner.enabled !== false ? (
            <div className={`sfm-preview-hero-frame ${heroBanner.fadeEdges ? 'sfm-preview-hero-fade' : ''}`}>
              {heroBanner.mediaType === 'video' && heroBanner.videoUrl ? (
                <video
                  ref={previewVideoRef}
                  src={heroBanner.videoUrl}
                  poster={heroBanner.posterImage || heroBanner.image}
                  autoPlay={heroBanner.autoPlay !== false}
                  muted={heroBanner.muted !== false}
                  loop={heroBanner.loop !== false}
                  playsInline
                  className="sfm-preview-hero-media"
                />
              ) : (
                <img
                  src={heroBanner.image || '/assets/main-banner.webp'}
                  alt="Live Hero Preview"
                  className="sfm-preview-hero-media"
                />
              )}

              {/* Tint Overlay */}
              {Number(heroBanner.overlayOpacity ?? 0) > 0 && (
                <div
                  className="sfm-preview-hero-overlay"
                  style={{ background: `rgba(0, 0, 0, ${(heroBanner.overlayOpacity ?? 0) / 100})` }}
                />
              )}
            </div>
          ) : (
            <div style={{ background: '#f1f5f9', padding: '30px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
              🚫 Hero Banner is currently disabled
            </div>
          )}

          {/* Shop Now button */}
          <div className="sfm-preview-cta-row">
            <button type="button" className="sfm-preview-cta-btn">
              Shop Now &rarr;
            </button>
          </div>

          {/* Featured Categories Preview */}
          <div className="sfm-preview-section-title">— Featured Categories —</div>
          <div className="sfm-preview-categories-row">
            {config.categories.filter(c => c.published).slice(0, 5).map(cat => (
              <div key={cat.id} className="sfm-preview-category-chip">
                <span>🏆</span>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>

          {/* Popular This Week Preview */}
          <div className="sfm-preview-section-title" style={{ marginTop: '8px' }}>Popular This Week</div>
          <div className="sfm-preview-products-grid">
            {sampleTrending.map(product => (
              <div key={product.id} className="sfm-preview-product-card">
                <img src={product.image} alt={product.name} className="sfm-preview-product-img" />
                <div className="sfm-preview-product-info">
                  <div className="sfm-preview-product-name">{product.name}</div>
                  <div className="sfm-preview-product-price">৳ {product.price.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* New Arrivals Preview */}
          <div className="sfm-preview-section-title" style={{ marginTop: '4px' }}>New Arrivals</div>
          <div className="sfm-preview-products-grid">
            {sampleNewArrivals.map(product => (
              <div key={product.id} className="sfm-preview-product-card">
                <img src={product.image} alt={product.name} className="sfm-preview-product-img" />
                <div className="sfm-preview-product-info">
                  <div className="sfm-preview-product-name">{product.name}</div>
                  <div className="sfm-preview-product-price">৳ {product.price.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Simulated Mini Footer */}
          <div style={{ background: '#0a0e1a', color: '#94a3b8', padding: '16px', textAlign: 'center', fontSize: '0.68rem', marginTop: '16px' }}>
            © 2026 Gazi Sports 24. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 2. ANNOUNCEMENTS SECTION
// ============================================================
function AnnouncementsSection({ config, updateConfig }: SectionProps) {
  const items = config.announcements;

  const update = (id: number, field: keyof AnnouncementItem, value: any) => {
    updateConfig('announcements', items.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const add = () => {
    const newId = Math.max(0, ...items.map(a => a.id)) + 1;
    updateConfig('announcements', [...items, { id: newId, text: '📢 New announcement text here', enabled: true }]);
  };

  const remove = (id: number) => {
    updateConfig('announcements', items.filter(a => a.id !== id));
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Announcement Bar</div>
          <div className="sfm-section-subtitle">Scrolling messages at the top of your store</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={add}><Plus size={14} /> Add</button>
      </div>

      <div className="sfm-item-list">
        {items.map((item, idx) => (
          <div key={item.id} className="sfm-item">
            <div className="sfm-item-number">{idx + 1}</div>
            <input
              className="sfm-input"
              style={{ flex: 1 }}
              value={item.text}
              onChange={e => update(item.id, 'text', e.target.value)}
            />
            <Toggle checked={item.enabled} onChange={(v) => update(item.id, 'enabled', v)} />
            <button className="sfm-btn-icon danger" onClick={() => remove(item.id)}><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="sfm-empty">
            <Megaphone size={32} className="sfm-empty-icon" />
            <div className="sfm-empty-title">No announcements</div>
            <div>Click "Add" to create one</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 3. CATEGORIES SECTION
// ============================================================
function CategoriesSection({ config, updateConfig }: SectionProps) {
  const [editId, setEditId] = useState<number | null>(null);
  const items = config.categories || [];

  const syncFromProducts = () => {
    const uniqueCategoryNames = Array.from(
      new Set(
        config.products
          .filter(p => p.published && p.category)
          .map(p => p.category.trim())
      )
    ).filter(Boolean);

    if (uniqueCategoryNames.length === 0) {
      alert('No categories found in published products.');
      return;
    }

    const newCategories = uniqueCategoryNames.map((name, index) => ({
      id: index + 1,
      name,
      icon: 'Grid3X3',
      count: config.products.filter(p => p.published && p.category === name).length,
      published: true,
      sortOrder: index + 1,
    }));

    updateConfig('categories', newCategories);
  };

  const update = (id: number, field: keyof CategoryConfig, value: any) => {
    updateConfig('categories', items.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const add = () => {
    const newId = Math.max(0, ...items.map(c => c.id)) + 1;
    updateConfig('categories', [...items, {
      id: newId, name: 'New Category', icon: 'Grid3X3',
      count: 0, published: true, sortOrder: items.length + 1,
    }]);
    setEditId(newId);
  };

  const remove = (id: number) => {
    const cat = items.find(c => c.id === id);
    if (cat) {
      const isJerseyCategory = cat.name.toLowerCase().includes('jersey') || cat.name.toLowerCase().includes('jarsey');
      if (isJerseyCategory) {
        alert("This special category ('" + cat.name + "') is locked and cannot be deleted because it handles custom jersey card presentation layout styles.");
        return;
      }
    }
    requirePassword(
      'Delete Category',
      `Are you sure you want to delete the category "${cat?.name || ''}"? Products in this category will not be deleted but they will no longer be categorized. Enter your admin password to confirm.`,
      () => {
        updateConfig('categories', items.filter(c => c.id !== id));
        if (editId === id) setEditId(null);
      }
    );
  };

  const move = (id: number, dir: -1 | 1) => {
    const idx = items.findIndex(c => c.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === items.length - 1)) return;
    const newArr = [...items];
    [newArr[idx], newArr[idx + dir]] = [newArr[idx + dir], newArr[idx]];
    updateConfig('categories', newArr);
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Product Categories</div>
          <div className="sfm-section-subtitle">Organize your store products into categories</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={syncFromProducts} title="Auto-detect categories from published products">
            <RotateCcw size={14} /> Sync from Products
          </button>
          <button className="btn btn-primary btn-sm" onClick={add}>
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      <div className="sfm-item-list">
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <Grid3X3 size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>No Categories Listed Here Yet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary, #94a3b8)', maxWidth: '420px', margin: '0 auto 20px' }}>
              Your live storefront automatically displays categories detected from your products. Click "Sync from Products" below to load and customize them directly here in the admin panel.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={syncFromProducts}>
                <RotateCcw size={14} /> Sync from Products ({Array.from(new Set(config.products.filter(p => p.published && p.category).map(p => p.category.trim()))).length} found)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={add}>
                <Plus size={14} /> Add Category Manually
              </button>
            </div>
          </div>
        ) : (
          items.map((cat, idx) => {
          const isJerseyCategory = cat.name.toLowerCase().includes('jersey') || cat.name.toLowerCase().includes('jarsey');
          const actualCount = config.products.filter(p => p.category === cat.name).length;
          return (
            <div key={cat.id}>
              <div className="sfm-item">
                <div className="sfm-item-number">{idx + 1}</div>
                <div className="sfm-item-content">
                  <div className="sfm-item-title">{cat.name}</div>
                  <div className="sfm-item-meta">
                    Image Mode: {cat.useCustomImage ? '🖼️ Custom Image Enabled' : '📦 Last Product Image (Auto)'} • {actualCount} products • Sort #{cat.sortOrder}
                  </div>
                </div>
                <span className={`sfm-card-badge ${cat.published ? 'enabled' : 'disabled'}`}>
                  {cat.published ? 'Published' : 'Draft'}
                </span>
                <div className="sfm-actions">
                  <button className="sfm-btn-icon" onClick={() => move(cat.id, -1)}><ChevronUp size={14} /></button>
                  <button className="sfm-btn-icon" onClick={() => move(cat.id, 1)}><ChevronDown size={14} /></button>
                  <button className="sfm-btn-icon" onClick={() => setEditId(editId === cat.id ? null : cat.id)}><Edit3 size={14} /></button>
                  <button 
                    className="sfm-btn-icon danger" 
                    onClick={() => remove(cat.id)}
                    title={isJerseyCategory ? "This Jersey category cannot be deleted" : "Delete category"}
                    style={{ opacity: isJerseyCategory ? 0.4 : 1, cursor: isJerseyCategory ? 'not-allowed' : 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

            {editId === cat.id && (
              <div className="sfm-expand">
                <div className="sfm-expand-body">
                  <div className="sfm-form-grid">
                    <div className="sfm-form-group">
                      <label className="sfm-label">Name</label>
                      <input className="sfm-input" value={cat.name} onChange={e => update(cat.id, 'name', e.target.value)} />
                    </div>
                    <div className="sfm-form-group">
                      <label className="sfm-label">Custom Category Image URL</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          className="sfm-input" 
                          placeholder="https://example.com/category-image.jpg or /uploads/..." 
                          value={cat.image || ''} 
                          onChange={e => update(cat.id, 'image', e.target.value)} 
                        />
                        {cat.image && (
                          <img src={cat.image} alt="Preview" style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                        )}
                      </div>
                    </div>
                    <div className="sfm-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <label className="sfm-label" style={{ marginBottom: 0 }}>Enable Custom Image</label>
                      <Toggle checked={!!cat.useCustomImage} onChange={(v) => update(cat.id, 'useCustomImage', v)} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary, #94a3b8)', marginLeft: '4px' }}>
                        {cat.useCustomImage ? '(Shows custom category image)' : '(Shows last added product photo)'}
                      </span>
                    </div>
                    <div className="sfm-form-group">
                      <label className="sfm-label">Product Count (Calculated)</label>
                      <input className="sfm-input" type="text" value={`${actualCount} products`} disabled style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    </div>
                    <div className="sfm-form-group">
                      <label className="sfm-label">Sort Order</label>
                      <input className="sfm-input" type="number" value={cat.sortOrder} onChange={e => update(cat.id, 'sortOrder', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="sfm-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <label className="sfm-label" style={{ marginBottom: 0 }}>Published</label>
                      <Toggle checked={cat.published} onChange={(v) => update(cat.id, 'published', v)} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        }))}
      </div>
    </div>
  );
}


// ============================================================
// 5. NAVIGATION SECTION
// ============================================================
function NavigationSection({ config, updateConfig }: SectionProps) {
  const items = config.navLinks;
  const [manageProductsId, setManageProductsId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const update = (id: number, field: keyof NavLinkItem, value: any) => {
    updateConfig('navLinks', items.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const add = () => {
    const newId = Math.max(0, ...items.map(n => n.id)) + 1;
    updateConfig('navLinks', [...items, { id: newId, label: 'New Link', url: '/store', enabled: true, productIds: [] }]);
  };

  const remove = (id: number) => {
    const link = items.find(n => n.id === id);
    requirePassword(
      'Delete Navigation Link',
      `Delete the navigation link "${link?.label || ''}"? Enter your admin password to confirm.`,
      () => {
        updateConfig('navLinks', items.filter(n => n.id !== id));
        if (manageProductsId === id) setManageProductsId(null);
      }
    );
  };

  const move = (id: number, dir: -1 | 1) => {
    const idx = items.findIndex(n => n.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === items.length - 1)) return;
    const newArr = [...items];
    [newArr[idx], newArr[idx + dir]] = [newArr[idx + dir], newArr[idx]];
    updateConfig('navLinks', newArr);
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Top Navigation Bar</div>
          <div className="sfm-section-subtitle">Links displayed in the store header. Manage custom collections by clicking the bag icon.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={add}><Plus size={14} /> Add Link</button>
      </div>

      <div className="sfm-item-list">
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="sfm-item">
              <div className="sfm-item-number">{idx + 1}</div>
              <div className="sfm-form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input className="sfm-input" value={item.label} onChange={e => update(item.id, 'label', e.target.value)} placeholder="Label" />
              </div>
              <div className="sfm-form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input className="sfm-input" value={item.url} onChange={e => update(item.id, 'url', e.target.value)} placeholder="URL" />
              </div>
              <Toggle checked={item.enabled} onChange={(v) => update(item.id, 'enabled', v)} />
              <div className="sfm-actions">
                {item.label.toLowerCase() !== 'home' && (
                  <button 
                    type="button"
                    className={`sfm-btn-icon ${manageProductsId === item.id ? 'active' : ''}`} 
                    onClick={() => {
                      setManageProductsId(manageProductsId === item.id ? null : item.id);
                      setSearchQuery('');
                    }}
                    title="Manage Products"
                    style={{ color: manageProductsId === item.id ? 'var(--accent-primary)' : undefined }}
                  >
                    <ShoppingBag size={14} />
                  </button>
                )}
                <button className="sfm-btn-icon" onClick={() => move(item.id, -1)}><ChevronUp size={14} /></button>
                <button className="sfm-btn-icon" onClick={() => move(item.id, 1)}><ChevronDown size={14} /></button>
                <button className="sfm-btn-icon danger" onClick={() => remove(item.id)}><Trash2 size={14} /></button>
              </div>
            </div>

            {/* Manage Products Panel */}
            {manageProductsId === item.id && item.label.toLowerCase() !== 'home' && (
              <div className="sfm-expand" style={{ marginTop: 4, marginBottom: 12, padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-secondary)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    Manage Products for "{item.label}" Collection
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    Selected: {(item.productIds || []).length} products
                  </div>
                </div>

                {/* Product Search Box */}
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    className="sfm-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                    placeholder="🔍 Search catalog products by name or category..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Web-style Card Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                  gap: 12, 
                  maxHeight: '340px', 
                  overflowY: 'auto', 
                  paddingRight: '4px',
                  paddingBottom: '8px'
                }}>
                  {config.products
                    .filter(prod => 
                      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      prod.category.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(prod => {
                      const selectedIds = item.productIds || [];
                      const isAdded = selectedIds.includes(prod.id);
                      return (
                        <div 
                          key={prod.id}
                          className="sfm-nav-prod-card"
                          onClick={() => {
                            const currentList = item.productIds || [];
                            const newList = currentList.includes(prod.id)
                              ? currentList.filter(id => id !== prod.id)
                              : [...currentList, prod.id];
                            update(item.id, 'productIds', newList);
                          }}
                          style={{ 
                            position: 'relative',
                            display: 'flex', 
                            flexDirection: 'column',
                            padding: '8px', 
                            background: isAdded ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.01)', 
                            border: '1px solid ' + (isAdded ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'), 
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isAdded ? '0 0 10px rgba(99, 102, 241, 0.15)' : 'none',
                            userSelect: 'none'
                          }}
                        >
                          {/* Selected checkmark overlay */}
                          {isAdded && (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: '#10b981',
                              color: '#fff',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                              zIndex: 2
                            }}>
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                          
                          {/* Product Image */}
                          <div style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', marginBottom: '6px' }}>
                            {prod.image ? (
                              <img src={prod.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}>
                                <ShoppingBag size={20} />
                              </div>
                            )}
                          </div>
                          
                          {/* Details */}
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {prod.category}
                              </div>
                              <div 
                                style={{ 
                                  fontSize: '11px', 
                                  fontWeight: 600, 
                                  color: 'var(--text-primary)',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: '14px',
                                  height: '28px',
                                  margin: '2px 0'
                                }} 
                                title={prod.name}
                              >
                                {prod.name}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)' }}>
                                ৳{prod.price}
                              </span>
                              <span style={{ fontSize: '9px', fontWeight: 600, color: isAdded ? '#10b981' : 'var(--text-tertiary)' }}>
                                {isAdded ? 'Added' : 'Click to Add'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Timer Configuration Section */}
                <div style={{ 
                  marginTop: '20px', 
                  paddingTop: '16px', 
                  borderTop: '1px dashed rgba(255,255,255,0.08)' 
                }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🕒 Timer Configuration (Countdown Clock)
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px',
                    alignItems: 'start'
                  }}>
                    {/* Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <Toggle 
                        checked={!!item.timerEnabled} 
                        onChange={(v) => update(item.id, 'timerEnabled', v)} 
                      />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Enable Countdown Timer</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Show a clock for this collection</div>
                      </div>
                    </div>

                    {/* Start Date/Time */}
                    <div className="sfm-form-group">
                      <label className="sfm-label" style={{ fontSize: '10px' }}>Target Start Date & Time (Optional for Upcoming)</label>
                      <input 
                        type="datetime-local" 
                        className="sfm-input" 
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                        value={item.timerStartDate || ''} 
                        onChange={e => update(item.id, 'timerStartDate', e.target.value)}
                        disabled={!item.timerEnabled}
                      />
                    </div>

                    {/* Start Timer Label */}
                    <div className="sfm-form-group">
                      <label className="sfm-label" style={{ fontSize: '10px' }}>Start Timer Label / Title</label>
                      <input 
                        type="text" 
                        className="sfm-input" 
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                        placeholder="e.g. Campaign starts in" 
                        value={item.timerStartLabel || ''} 
                        onChange={e => update(item.id, 'timerStartLabel', e.target.value)}
                        disabled={!item.timerEnabled}
                      />
                    </div>

                    {/* End Date/Time */}
                    <div className="sfm-form-group">
                      <label className="sfm-label" style={{ fontSize: '10px' }}>Target End Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="sfm-input" 
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                        value={item.timerEndDate || ''} 
                        onChange={e => update(item.id, 'timerEndDate', e.target.value)}
                        disabled={!item.timerEnabled}
                      />
                    </div>

                    {/* Timer Label */}
                    <div className="sfm-form-group">
                      <label className="sfm-label" style={{ fontSize: '10px' }}>End Timer Label / Title</label>
                      <input 
                        type="text" 
                        className="sfm-input" 
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                        placeholder="e.g. Offer ends in" 
                        value={item.timerLabel || ''} 
                        onChange={e => update(item.id, 'timerLabel', e.target.value)}
                        disabled={!item.timerEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 6. FOOTER SECTION
// ============================================================
function FooterSection({ config, updateConfig }: SectionProps) {
  const columns = config.footerColumns;
  const [activeEditLink, setActiveEditLink] = useState<{ colIdx: number; linkId: number } | null>(null);

  const updateColumnTitle = (colIdx: number, title: string) => {
    const newCols = columns.map((c, i) => i === colIdx ? { ...c, title } : c);
    updateConfig('footerColumns', newCols);
  };

  const updateLink = (colIdx: number, linkId: number, field: keyof NavLinkItem, value: any) => {
    const newCols = columns.map((c, i) =>
      i === colIdx
        ? { ...c, links: c.links.map(l => l.id === linkId ? { ...l, [field]: value } : l) }
        : c
    );
    updateConfig('footerColumns', newCols);
  };

  const addLink = (colIdx: number) => {
    const col = columns[colIdx];
    const newId = Math.max(0, ...col.links.map(l => l.id)) + 1;
    const newCols = columns.map((c, i) =>
      i === colIdx
        ? { ...c, links: [...c.links, { id: newId, label: 'New Link', url: '/store', enabled: true }] }
        : c
    );
    updateConfig('footerColumns', newCols);
  };

  const removeLink = (colIdx: number, linkId: number) => {
    const linkLabel = columns[colIdx]?.links.find(l => l.id === linkId)?.label || '';
    requirePassword(
      'Delete Footer Link',
      `Delete the footer link "${linkLabel}"? Enter your admin password to confirm.`,
      () => {
        const newCols = columns.map((c, i) =>
          i === colIdx
            ? { ...c, links: c.links.filter(l => l.id !== linkId) }
            : c
        );
        updateConfig('footerColumns', newCols);
        if (activeEditLink?.colIdx === colIdx && activeEditLink?.linkId === linkId) {
          setActiveEditLink(null);
        }
      }
    );
  };

  const addColumn = () => {
    updateConfig('footerColumns', [...columns, { title: 'New Column', links: [] }]);
  };

  const removeColumn = (colIdx: number) => {
    updateConfig('footerColumns', columns.filter((_, i) => i !== colIdx));
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Footer Columns</div>
          <div className="sfm-section-subtitle">Manage footer link columns. Click the edit button on a link to customize its rich HTML page content.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={addColumn}><Plus size={14} /> Add Column</button>
      </div>

      <div className="sfm-footer-columns">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="sfm-footer-column">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <input
                className="sfm-input"
                value={col.title}
                onChange={e => updateColumnTitle(colIdx, e.target.value)}
                style={{ fontWeight: 600, fontSize: '15px', border: 'none', padding: '4px 0', background: 'transparent' }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="sfm-btn-icon" onClick={() => addLink(colIdx)} title="Add link" style={{ width: 28, height: 28 }}><Plus size={12} /></button>
                <button className="sfm-btn-icon danger" onClick={() => removeColumn(colIdx)} title="Remove column" style={{ width: 28, height: 28 }}><Trash2 size={12} /></button>
              </div>
            </div>

            {col.links.map(link => (
              <div key={link.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, border: '1px solid rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="sfm-input" style={{ flex: 1, height: 32, fontSize: '12px' }} value={link.label} onChange={e => updateLink(colIdx, link.id, 'label', e.target.value)} placeholder="Link Label" />
                  <input className="sfm-input" style={{ flex: 1, height: 32, fontSize: '12px' }} value={link.customPageContent ? `/store/page/${link.id}` : link.url} onChange={e => updateLink(colIdx, link.id, 'url', e.target.value)} placeholder="URL" disabled={!!link.customPageContent} />
                  <button 
                    type="button"
                    className={`sfm-btn-icon ${activeEditLink?.colIdx === colIdx && activeEditLink?.linkId === link.id ? 'active' : ''}`}
                    onClick={() => {
                      if (activeEditLink?.colIdx === colIdx && activeEditLink?.linkId === link.id) {
                        setActiveEditLink(null);
                      } else {
                        setActiveEditLink({ colIdx, linkId: link.id });
                      }
                    }}
                    title="Edit Custom Page Content"
                    style={{ width: 28, height: 28, color: link.customPageContent ? 'var(--color-primary)' : undefined }}
                  >
                    <Edit3 size={12} />
                  </button>
                  <Toggle checked={link.enabled} onChange={v => updateLink(colIdx, link.id, 'enabled', v)} />
                  <button className="sfm-btn-icon danger" onClick={() => removeLink(colIdx, link.id)} style={{ width: 28, height: 28 }}><X size={12} /></button>
                </div>

                {activeEditLink?.colIdx === colIdx && activeEditLink?.linkId === link.id && (
                  <div style={{ marginTop: 6, borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                        📄 Page Content (HTML allowed, e.g. &lt;h3&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;)
                      </span>
                      {link.customPageContent !== undefined ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '10px', padding: '2px 8px', height: 'auto', minHeight: 'unset' }}
                          onClick={() => {
                            if (window.confirm('Delete custom page content? The link will revert to a standard URL.')) {
                              updateLink(colIdx, link.id, 'customPageContent', undefined);
                            }
                          }}
                        >
                          Disable Page Content
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '10px', padding: '2px 8px', height: 'auto', minHeight: 'unset' }}
                          onClick={() => {
                            updateLink(colIdx, link.id, 'customPageContent', '<h3>New Page</h3><p>Write your page content here.</p>');
                          }}
                        >
                          Enable Page Content
                        </button>
                      )}
                    </div>
                    {link.customPageContent !== undefined ? (
                      <textarea
                        className="sfm-textarea"
                        rows={6}
                        style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
                        value={link.customPageContent}
                        onChange={e => updateLink(colIdx, link.id, 'customPageContent', e.target.value)}
                        placeholder="<h3>Heading</h3><p>Page body content...</p>"
                      />
                    ) : (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', padding: '2px 0' }}>
                        This is currently set as a standard redirect link to: {link.url}. Click "Enable Page Content" to change it to an admin-editable custom page.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 9. MOST SELLING & TRENDING SECTION
// ============================================================
function FeaturedCollectionsSection({ config, updateConfig }: SectionProps) {
  const [trendingQuery, setTrendingQuery] = useState('');
  const [newArrivalQuery, setNewArrivalQuery] = useState('');

  const trendingIds = config.trendingProductIds || [];
  const newArrivalIds = config.newArrivalProductIds || [];

  const toggleProductInList = (listKey: 'trendingProductIds' | 'newArrivalProductIds', prodId: number) => {
    const currentList = config[listKey] || [];
    const newList = currentList.includes(prodId)
      ? currentList.filter(id => id !== prodId)
      : [...currentList, prodId];
    updateConfig(listKey, newList);
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Homepage Product Collections</div>
          <div className="sfm-section-subtitle">Manage homepage trending and new arrivals collections. Use search to add/remove products.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>

        {/* Trending Section */}
        <div className="sfm-card" style={{ margin: 0 }}>
          <div className="sfm-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sfm-card-title">📈 Trending Collection</div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Selected: {trendingIds.length}</span>
          </div>

          <div style={{ padding: '16px' }}>
            {/* Search Box */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                className="sfm-input"
                style={{ width: '100%' }}
                placeholder="Search products to add to Trending..."
                value={trendingQuery}
                onChange={e => setTrendingQuery(e.target.value)}
              />
            </div>

            {/* Catalog Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
              gap: '12px', 
              maxHeight: '260px', 
              overflowY: 'auto',
              marginBottom: '20px',
              paddingRight: '4px'
            }}>
              {config.products
                .filter(prod => 
                  prod.name.toLowerCase().includes(trendingQuery.toLowerCase()) || 
                  prod.category.toLowerCase().includes(trendingQuery.toLowerCase())
                )
                .map(prod => {
                  const isAdded = trendingIds.includes(prod.id);
                  return (
                    <div 
                      key={prod.id}
                      onClick={() => toggleProductInList('trendingProductIds', prod.id)}
                      style={{ 
                        position: 'relative', display: 'flex', flexDirection: 'column', padding: '8px', 
                        background: isAdded ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255,255,255,0.01)', 
                        border: '1px solid ' + (isAdded ? 'var(--sf-info, #2563eb)' : 'rgba(255,255,255,0.05)'), 
                        borderRadius: '8px', cursor: 'pointer', userSelect: 'none'
                      }}
                    >
                      {isAdded && (
                        <div style={{
                          position: 'absolute', top: '4px', right: '4px', background: '#10b981', color: '#fff',
                          width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                        }}>
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                      <div style={{ width: '100%', height: '60px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', marginBottom: '6px' }}>
                        {prod.image && <img src={prod.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '14px', height: '28px' }}>
                        {prod.name}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* New Arrivals Section */}
        <div className="sfm-card" style={{ margin: 0 }}>
          <div className="sfm-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sfm-card-title">✨ New Arrivals Collection</div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Selected: {newArrivalIds.length}</span>
          </div>

          <div style={{ padding: '16px' }}>
            {/* Search Box */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                className="sfm-input"
                style={{ width: '100%' }}
                placeholder="Search products to add to New Arrivals..."
                value={newArrivalQuery}
                onChange={e => setNewArrivalQuery(e.target.value)}
              />
            </div>

            {/* Catalog Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
              gap: '12px', 
              maxHeight: '260px', 
              overflowY: 'auto',
              marginBottom: '20px',
              paddingRight: '4px'
            }}>
              {config.products
                .filter(prod => 
                  prod.name.toLowerCase().includes(newArrivalQuery.toLowerCase()) || 
                  prod.category.toLowerCase().includes(newArrivalQuery.toLowerCase())
                )
                .map(prod => {
                  const isAdded = newArrivalIds.includes(prod.id);
                  return (
                    <div 
                      key={prod.id}
                      onClick={() => toggleProductInList('newArrivalProductIds', prod.id)}
                      style={{ 
                        position: 'relative', display: 'flex', flexDirection: 'column', padding: '8px', 
                        background: isAdded ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.01)', 
                        border: '1px solid ' + (isAdded ? 'var(--sf-success, #10b981)' : 'rgba(255,255,255,0.05)'), 
                        borderRadius: '8px', cursor: 'pointer', userSelect: 'none'
                      }}
                    >
                      {isAdded && (
                        <div style={{
                          position: 'absolute', top: '4px', right: '4px', background: '#10b981', color: '#fff',
                          width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                        }}>
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                      <div style={{ width: '100%', height: '60px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', marginBottom: '6px' }}>
                        {prod.image && <img src={prod.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '14px', height: '28px' }}>
                        {prod.name}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================
// 7. BRANDING & CONTACT SECTION
// ============================================================
function BrandingSection({ config, updateConfig }: SectionProps) {
  const b = config.branding;
  const c = config.contactInfo;

  const updateB = (field: keyof typeof b, value: string) => {
    updateConfig('branding', { ...b, [field]: value });
  };

  const updateC = (field: keyof typeof c, value: string) => {
    updateConfig('contactInfo', { ...c, [field]: value });
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Branding & Contact</div>
          <div className="sfm-section-subtitle">Store identity and contact information</div>
        </div>
      </div>

      <div className="sfm-card">
        <div className="sfm-card-header">
          <div className="sfm-card-title"><Palette size={16} /> Store Branding</div>
        </div>
        <div className="sfm-form-grid">
          <div className="sfm-form-group">
            <label className="sfm-label">Store Name</label>
            <input className="sfm-input" value={b.storeName} onChange={e => updateB('storeName', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Logo Text (Primary)</label>
            <input className="sfm-input" value={b.logoTextPrimary} onChange={e => updateB('logoTextPrimary', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Logo Text (Secondary)</label>
            <input className="sfm-input" value={b.logoTextSecondary} onChange={e => updateB('logoTextSecondary', e.target.value)} />
          </div>
          <div className="sfm-form-group full-width">
            <label className="sfm-label">Footer Description</label>
            <textarea className="sfm-textarea" value={b.footerDescription} onChange={e => updateB('footerDescription', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Copyright Text</label>
            <input className="sfm-input" value={b.copyrightText} onChange={e => updateB('copyrightText', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Payment Methods Text</label>
            <input className="sfm-input" value={b.paymentMethodsText} onChange={e => updateB('paymentMethodsText', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="sfm-card">
        <div className="sfm-card-header">
          <div className="sfm-card-title"><Link2 size={16} /> Contact Information</div>
        </div>
        <div className="sfm-form-grid">
          <div className="sfm-form-group">
            <label className="sfm-label">WhatsApp Number</label>
            <input className="sfm-input" value={c.whatsappNumber} onChange={e => updateC('whatsappNumber', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Phone Number</label>
            <input className="sfm-input" value={c.phoneNumber} onChange={e => updateC('phoneNumber', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Email</label>
            <input className="sfm-input" value={c.email} onChange={e => updateC('email', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Messenger URL</label>
            <input className="sfm-input" value={c.messengerUrl} onChange={e => updateC('messengerUrl', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Facebook Page URL</label>
            <input className="sfm-input" value={c.facebookUrl || ''} onChange={e => updateC('facebookUrl', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">TikTok Profile URL</label>
            <input className="sfm-input" value={c.tiktokUrl || ''} onChange={e => updateC('tiktokUrl', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Instagram Profile URL</label>
            <input className="sfm-input" value={c.instagramUrl || ''} onChange={e => updateC('instagramUrl', e.target.value)} />
          </div>
          <div className="sfm-form-group full-width">
            <label className="sfm-label">🏢 Shop Physical Address</label>
            <input
              className="sfm-input"
              value={c.shopAddress || ''}
              onChange={e => updateC('shopAddress', e.target.value)}
              placeholder="e.g. Sector 10, Uttara, Dhaka, Bangladesh"
            />
          </div>
          <div className="sfm-form-group full-width">
            <label className="sfm-label">📍 Google Maps Link (Shop Location)</label>
            <input
              className="sfm-input"
              value={c.shopLocationMapUrl || ''}
              onChange={e => updateC('shopLocationMapUrl', e.target.value)}
              placeholder="Paste Google Maps URL here (e.g. https://maps.google.com/?q=...)"
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              When set, a "Find Us on Google Maps" link will appear in the footer. Leave empty to hide it.
            </div>
          </div>
        </div>
      </div>

      <div className="sfm-card">
        <div className="sfm-card-header">
          <div className="sfm-card-title"><CreditCard size={16} /> Send Money Payment Numbers (bKash & Nagad)</div>
        </div>
        <div className="sfm-form-grid">
          <div className="sfm-form-group">
            <label className="sfm-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#e11d48' }} />
              bKash Number (Personal / Send Money)
            </label>
            <input 
              className="sfm-input" 
              value={c.bkashNumber || ''} 
              onChange={e => updateC('bkashNumber', e.target.value)} 
              placeholder="e.g. 01700000000" 
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Customers will see this number during Checkout when selecting bKash Send Money.
            </div>
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} />
              Nagad Number (Personal / Send Money)
            </label>
            <input 
              className="sfm-input" 
              value={c.nagadNumber || ''} 
              onChange={e => updateC('nagadNumber', e.target.value)} 
              placeholder="e.g. 01800000000" 
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Customers will see this number during Checkout when selecting Nagad Send Money.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 8. FEATURE BADGES SECTION
// ============================================================
function BadgesSection({ config, updateConfig }: SectionProps) {
  const [editId, setEditId] = useState<number | null>(null);
  const items = config.featureBadges;

  const BADGE_ICONS = ['Truck', 'Shield', 'RotateCcw', 'Headphones', 'Star', 'Zap', 'Gift', 'Award', 'ThumbsUp', 'Clock'];

  const update = (id: number, field: keyof FeatureBadge, value: any) => {
    updateConfig('featureBadges', items.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const add = () => {
    const newId = Math.max(0, ...items.map(b => b.id)) + 1;
    updateConfig('featureBadges', [...items, { id: newId, icon: 'Star', title: 'New Badge', description: 'Description', enabled: true }]);
    setEditId(newId);
  };

  const remove = (id: number) => {
    updateConfig('featureBadges', items.filter(b => b.id !== id));
    if (editId === id) setEditId(null);
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Trust / Feature Badges</div>
          <div className="sfm-section-subtitle">Badges displayed below the hero section (Free Shipping, Secure Payment, etc.)</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={add}><Plus size={14} /> Add Badge</button>
      </div>

      <div className="sfm-item-list">
        {items.map((badge, idx) => (
          <div key={badge.id}>
            <div className="sfm-item">
              <div className="sfm-item-number">{idx + 1}</div>
              <div className="sfm-item-content">
                <div className="sfm-item-title">{badge.title}</div>
                <div className="sfm-item-meta">Icon: {badge.icon} • {badge.description}</div>
              </div>
              <Toggle checked={badge.enabled} onChange={(v) => update(badge.id, 'enabled', v)} />
              <div className="sfm-actions">
                <button className="sfm-btn-icon" onClick={() => setEditId(editId === badge.id ? null : badge.id)}><Edit3 size={14} /></button>
                <button className="sfm-btn-icon danger" onClick={() => remove(badge.id)}><Trash2 size={14} /></button>
              </div>
            </div>

            {editId === badge.id && (
              <div className="sfm-expand">
                <div className="sfm-expand-body">
                  <div className="sfm-form-grid">
                    <div className="sfm-form-group">
                      <label className="sfm-label">Title</label>
                      <input className="sfm-input" value={badge.title} onChange={e => update(badge.id, 'title', e.target.value)} />
                    </div>
                    <div className="sfm-form-group">
                      <label className="sfm-label">Icon</label>
                      <select className="sfm-select" value={badge.icon} onChange={e => update(badge.id, 'icon', e.target.value)}>
                        {BADGE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </div>
                    <div className="sfm-form-group full-width">
                      <label className="sfm-label">Description</label>
                      <input className="sfm-input" value={badge.description} onChange={e => update(badge.id, 'description', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 9. DELIVERY CONFIGURATION SECTION
// ============================================================
function DeliverySection({ config, updateConfig }: SectionProps) {
  const d = config.delivery;

  const updateD = (field: keyof typeof d, value: any) => {
    updateConfig('delivery', { ...d, [field]: value });
  };

  return (
    <div className="sfm-section">
      <div className="sfm-section-header">
        <div>
          <div className="sfm-section-title">Delivery Configuration</div>
          <div className="sfm-section-subtitle">Manage delivery shipping prices and timelines</div>
        </div>
      </div>

      <div className="sfm-card">
        <div className="sfm-card-header">
          <div className="sfm-card-title"><Truck size={16} /> Delivery Configuration</div>
        </div>
        <div className="sfm-form-grid">
          <div className="sfm-form-group">
            <label className="sfm-label">Inside Dhaka Price (৳)</label>
            <input className="sfm-input" type="number" value={d.insideDhakaPrice} onChange={e => updateD('insideDhakaPrice', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Inside Dhaka Timeline</label>
            <input className="sfm-input" value={d.insideDhakaTimeline} onChange={e => updateD('insideDhakaTimeline', e.target.value)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Outside Dhaka Price (৳)</label>
            <input className="sfm-input" type="number" value={d.outsideDhakaPrice} onChange={e => updateD('outsideDhakaPrice', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="sfm-form-group">
            <label className="sfm-label">Outside Dhaka Timeline</label>
            <input className="sfm-input" value={d.outsideDhakaTimeline} onChange={e => updateD('outsideDhakaTimeline', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

