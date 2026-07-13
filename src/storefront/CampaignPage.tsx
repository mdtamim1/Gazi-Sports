import { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Star, Heart, ShoppingCart, Clock, ArrowLeft, Zap, Gift } from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { fetchCampaignsFromBackend } from '../services/api';

interface StorefrontContext {
  addToCart: (product: any) => void;
  toggleWishlist: (productId: number) => void;
  wishlist: number[];
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="product-card-stars">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={12} fill={i <= Math.round(rating) ? '#fbbf24' : 'none'} color="#fbbf24" />
    ))}
  </div>
);

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart, toggleWishlist, wishlist } = useOutletContext<StorefrontContext>();
  const [config] = useStorefrontConfig();
  
  const [campaign, setCampaign] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  // Load campaign list from backend SQLite
  useEffect(() => {
    const loadCampaign = async () => {
      setLoading(true);
      try {
        const list = await fetchCampaignsFromBackend();
        let match = null;
        if (list) {
          match = list.find((c: any) => String(c.id) === String(id));
        }

        // Fallback to local storage if not found in backend list
        if (!match) {
          const stored = localStorage.getItem('campaignList');
          if (stored) {
            const localList = JSON.parse(stored);
            if (Array.isArray(localList)) {
              match = localList.find((c: any) => String(c.id) === String(id));
            }
          }
        }

        if (match) {
          setCampaign(match);
        }
      } catch (e) {
        console.error('Failed to load campaign info:', e);
        // Direct local storage fallback on exception
        const stored = localStorage.getItem('campaignList');
        if (stored) {
          try {
            const localList = JSON.parse(stored);
            if (Array.isArray(localList)) {
              const match = localList.find((c: any) => String(c.id) === String(id));
              if (match) setCampaign(match);
            }
          } catch (err) {
            console.error('Error parsing stored campaignList:', err);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    loadCampaign();
  }, [id]);

  // Campaign countdown timer loop
  useEffect(() => {
    if (!campaign || !campaign.endDate) return;

    const calculate = () => {
      const now = new Date().getTime();
      const end = new Date(campaign.endDate).getTime();
      
      if (isNaN(end)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#64748b' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>ক্যাম্পেইন লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="store-container" style={{ padding: '80px 24px', textAlign: 'center', minHeight: '60vh' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>ক্যাম্পেইন পাওয়া যায়নি</h2>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>এই ক্যাম্পেইনটি বর্তমানে অ্যাক্টিভ নেই অথবা ডিলিট করা হয়েছে।</p>
        <Link to="/" className="store-btn" style={{ textDecoration: 'none', display: 'inline-flex', gap: '8px', alignItems: 'center', background: 'var(--sf-accent)', color: 'white', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold' }}>
          <ArrowLeft size={18} /> হোমপেজে ফিরে যান
        </Link>
      </div>
    );
  }

  // Filter products matching this campaign (robust type-agnostic normalized search)
  const campaignProducts = config.products.filter(p => {
    if (!p.published) return false;
    
    const targetIds = campaign.productIds 
      ? campaign.productIds.map((id: any) => String(id).trim()) 
      : [];
      
    if (targetIds.length > 0) {
      return targetIds.includes(String(p.id).trim());
    }
    
    if (campaign.productId) {
      return String(p.id).trim() === String(campaign.productId).trim();
    }
    
    return false;
  });

  return (
    <div className="store-container" style={{ padding: '32px 16px', minHeight: '80vh' }}>
      
      {/* Back Button */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, marginBottom: '24px', transition: 'color 0.2s' }} className="hover-accent">
        <ArrowLeft size={16} /> হোমপেজে যান
      </Link>

      {/* Hero Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '24px',
        padding: '40px 24px',
        color: '#ffffff',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        marginBottom: '40px'
      }}>
        {/* Glow decoration */}
        <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--sf-accent)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '30px', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
          <Zap size={12} fill="#ffffff" /> Active Campaign
        </span>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', margin: '0 0 12px 0', lineHeight: 1.2 }}>
          {campaign.name}
        </h1>

        <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '0 0 24px 0' }}>
          মেয়াদ: {new Date(campaign.startDate).toLocaleDateString('bn-BD')} থেকে {new Date(campaign.endDate).toLocaleDateString('bn-BD')}
        </p>

        {/* Countdown Timer */}
        {campaign.endDate && !timeLeft.expired && (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px 24px', borderRadius: '16px', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> ক্যাম্পেইন শেষ হতে বাকি
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>{String(timeLeft.days).padStart(2, '0')}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Days</span>
              </div>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 900, fontSize: '1.2rem', marginBottom: '12px' }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>{String(timeLeft.hours).padStart(2, '0')}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Hours</span>
              </div>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 900, fontSize: '1.2rem', marginBottom: '12px' }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Mins</span>
              </div>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 900, fontSize: '1.2rem', marginBottom: '12px' }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f43f5e' }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Secs</span>
              </div>
            </div>
          </div>
        )}

        {timeLeft.expired && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '10px 20px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>
            <Clock size={16} /> এই অফারটির মেয়াদ শেষ হয়ে গেছে
          </div>
        )}
      </div>

      {/* Associated Products Section */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>
          ক্যাম্পেইনের অফারকৃত পণ্যসমূহ ({campaignProducts.length})
        </h2>

        {campaignProducts.length > 0 ? (
          <div className="products-grid">
            {campaignProducts.map((product) => {
              const isWishlisted = wishlist.includes(product.id);
              return (
                <div key={product.id} className="product-card">
                  <div className="product-card-image-wrap">
                    <img src={product.image} alt={product.name} className="product-card-image" />
                    {product.badge && (
                      <span className="product-card-badge">{product.badge}</span>
                    )}
                    <button 
                      onClick={() => toggleWishlist(product.id)}
                      className={`product-card-wishlist ${isWishlisted ? 'active' : ''}`}
                      title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="product-card-details">
                    <StarRating rating={product.rating || 4.5} />
                    <Link to={`/product/${product.id}`} className="product-card-title">
                      {product.name}
                    </Link>
                    <div className="product-card-footer">
                      <div className="product-card-price">
                        ৳{product.price}
                        {product.originalPrice && (
                          <span className="product-card-original-price" style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.85rem', marginLeft: '6px' }}>৳{product.originalPrice}</span>
                        )}
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        className="product-card-cart-btn"
                        title="Add to Cart"
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
            <Gift size={40} style={{ color: '#94a3b8', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>কোনো পণ্য পাওয়া যায়নি</h3>
            <p style={{ color: '#64748b' }}>এই ক্যাম্পেইনে কোনো পণ্য অ্যাসাইন করা হয়নি।</p>
          </div>
        )}
      </div>

    </div>
  );
}
