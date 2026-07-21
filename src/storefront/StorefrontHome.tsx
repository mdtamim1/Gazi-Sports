import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Link, useLocation } from 'react-router-dom';
import { Truck, Shield, RotateCcw, Headphones, Star, Heart, ShoppingCart, Zap,
  Smartphone, Shirt, Home as HomeIcon, Dumbbell, Sparkles, BookOpen,
  Monitor, Camera, Watch, Car, Baby, Flower, Palette, Music, Gamepad, Gift,
  Grid3X3, ArrowRight, X, List
} from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { CountdownTimer } from './CollectionPage';
import { fetchCampaignsFromBackend } from '../services/api';
import { OptimizedImage } from '../components/layout/OptimizedImage';
import { SEOMeta } from '../components/layout/SEOMeta';

interface StorefrontContext {
  addToCart: (product: any) => void;
  toggleWishlist: (productId: number) => void;
  wishlist: number[];
}

// Icon lookup map for dynamic icon resolution from config
const ICON_MAP: Record<string, any> = {
  Smartphone, Shirt, Home: HomeIcon, Dumbbell, Sparkles, BookOpen,
  Monitor, Camera, Headphones, Watch, Car, Baby,
  Pizza: Gift, Flower, Palette, Music, Gamepad, Gift,
  Grid3X3, Truck, Shield, RotateCcw, Zap, Star,
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="product-card-stars">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={12} fill={i <= Math.round(rating) ? '#fbbf24' : 'none'} color="#fbbf24" />
    ))}
  </div>
);

export default function StorefrontHome() {
  const { addToCart, toggleWishlist, wishlist, searchQuery } = useOutletContext<any>();
  const [config, , configReady] = useStorefrontConfig();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const location = useLocation();



  // Load active campaigns from backend API
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const announcements = config.announcements ? config.announcements.filter((a: any) => a.enabled) : [];
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const campaigns = await fetchCampaignsFromBackend();
        if (campaigns) {
          const active = campaigns.filter((c: any) => c.status === 'active');
          setActiveCampaigns(active);
        } else {
          // Fallback to localStorage if API is offline
          const stored = localStorage.getItem('campaignList');
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) {
              setActiveCampaigns(list.filter((c: any) => c.status === 'active'));
            }
          }
        }
      } catch (e) {
        console.error('Failed to load campaigns:', e);
      }
    };
    loadCampaigns();
  }, []);


  // Shuffle products randomly on component mount or products update
  const shuffledProducts = useMemo(() => {
    const publishedProducts = config.products.filter(p => p.published);
    return [...publishedProducts].sort(() => Math.random() - 0.5);
  }, [config.products]);

  // Get trending products (all selected products, or fallback to first 6 published products)
  const trendingProducts = useMemo(() => {
    const ids = config.trendingProductIds || [];
    const stringIds = ids.map(String);
    const selectedList = config.products.filter(p => p.published && stringIds.includes(String(p.id)));
    
    // If admin explicitly selected products, show all of them. Otherwise fall back to first 6 published products.
    if (selectedList.length > 0) {
      return selectedList;
    }
    return config.products.filter(p => p.published).slice(0, 6);
  }, [config.products, config.trendingProductIds]);

  // Get new arrival products (all selected products, or fallback to first 4 published products)
  const newArrivalProducts = useMemo(() => {
    const ids = config.newArrivalProductIds || [];
    const stringIds = ids.map(String);
    const selectedList = config.products.filter(p => p.published && stringIds.includes(String(p.id)));
    
    // If admin explicitly selected products, show all of them. Otherwise fall back to first 4 published products.
    if (selectedList.length > 0) {
      return selectedList;
    }
    return config.products.filter(p => p.published).slice(0, 4);
  }, [config.products, config.newArrivalProductIds]);

  const renderProductCard = (product: any) => {
    const isJersey = product.category && (product.category.toLowerCase() === 'jersey' || product.category.toLowerCase() === 'jerseys');
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    
    const productSlug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (isJersey) {
      const isSoldOut = !product.inStock || (product.stock !== undefined && product.stock <= 0);
      return (
        <Link to={`/product/${productSlug}`} key={product.id} className="jersey-product-card" style={{ textDecoration: 'none' }}>
          <div className="jersey-product-image-container">
            <OptimizedImage src={product.image} alt={product.name} className="jersey-product-image" width={400} height={533} />
            <button 
              type="button"
              className="product-card-wishlist"
              style={{ left: '12px', right: 'auto' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              title={wishlist.some((id: any) => String(id) === String(product.id)) ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart 
                size={16} 
                fill={wishlist.some((id: any) => String(id) === String(product.id)) ? "var(--sf-danger)" : "none"} 
                color={wishlist.some((id: any) => String(id) === String(product.id)) ? "var(--sf-danger)" : "currentColor"} 
              />
            </button>
            <div className="jersey-badges-container">
              <span className="jersey-badge jersey-badge-limited">LIMITED STOCK</span>
              {hasDiscount && (
                <span className="jersey-badge jersey-badge-discount">-{discountPercent}%</span>
              )}
              {isSoldOut && (
                <span className="jersey-badge jersey-badge-soldout">Sold out</span>
              )}
            </div>
          </div>
          <div className="jersey-product-body">
            <h3 className="jersey-product-name">{product.name}</h3>
            <div className="jersey-product-price-row">
              {hasDiscount && (
                <span className="jersey-product-original-price">
                  Tk {product.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              <span className="jersey-product-price">
                Tk {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Link>
      );
    }

    const isSoldOut = !product.inStock || (product.stock !== undefined && product.stock <= 0);
    const hasOptions = product.sizes && product.sizes.some((s: any) => s.enabled);
    return (
      <Link to={`/product/${productSlug}`} key={product.id} className="trending-product-card" style={{ textDecoration: 'none' }}>
        <div className="trending-product-image-container">
          <OptimizedImage src={product.image} alt={product.name} className="trending-product-image" width={400} height={400} />
          <button 
            type="button"
            className="product-card-wishlist"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            title={wishlist.some((id: any) => String(id) === String(product.id)) ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart 
              size={16} 
              fill={wishlist.some((id: any) => String(id) === String(product.id)) ? "var(--sf-danger)" : "none"} 
              color={wishlist.some((id: any) => String(id) === String(product.id)) ? "var(--sf-danger)" : "currentColor"} 
            />
          </button>
          {isSoldOut ? (
            <span className="trending-product-badge sold-out" style={{ background: '#ef4444' }}>স্টক আউট</span>
          ) : hasDiscount ? (
            <span className="trending-product-badge">
              -{discountPercent}%
            </span>
          ) : product.badge ? (
            <span className="trending-product-badge">
              {product.badge === 'sale' ? 'Sale!' : 'New'}
            </span>
          ) : null}
        </div>
        <div className="trending-product-body">
          <h3 className="trending-product-name">{product.name}</h3>
          <div className="trending-product-price-row">
            {hasDiscount && (
              <span className="trending-product-original-price">
                ৳ {product.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            <span className="trending-product-price">
              ৳ {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="trending-product-action-container">
            {isSoldOut ? (
              <span className="trending-product-action-btn disabled" style={{ background: '#f1f5f9', color: 'var(--sf-text-tertiary)', border: '1px solid var(--sf-border)', cursor: 'not-allowed', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                স্টক আউট
              </span>
            ) : hasOptions ? (
              <span className="trending-product-action-btn">
                <List size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Select options
              </span>
            ) : (
              <button
                className="trending-product-action-btn-raw"
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  addToCart(product); 
                }}
              >
                <ShoppingCart size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Add to cart
              </button>
            )}
          </div>
        </div>
      </Link>
    );
  };


  const filteredProducts = shuffledProducts.filter(p => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 150);
      }
    }
  }, [location.hash]);

  // Filter enabled banners
  const banners = config.banners.filter(b => b.enabled);
  // Filter published categories
  let categories = config.categories.filter(c => c.published).sort((a, b) => a.sortOrder - b.sortOrder);
  if (categories.length === 0) {
    const uniqueCategoryNames = Array.from(new Set(config.products.filter(p => p.published).map(p => p.category)));
    const iconMap: Record<string, string> = {
      'Electronics': 'Smartphone',
      'Fashion': 'Shirt',
      'Home & Garden': 'Home',
      'Sports': 'Dumbbell',
      'Beauty': 'Sparkles',
      'Books': 'BookOpen',
    };
    categories = uniqueCategoryNames.map((name, index) => ({
      id: index + 1,
      name,
      icon: iconMap[name] || 'Grid3X3',
      count: config.products.filter(p => p.published && p.category === name).length,
      published: true,
      sortOrder: index + 1
    }));
  }


  // Find if there is an active timed campaign
  const activePromoSection = config.navLinks.find(n => n.enabled && n.timerEnabled && n.timerEndDate);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    } else if (isRightSwipe) {
      setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length);
    }
  };

  return (
    <>
      <SEOMeta 
        title="Gazi Sports 24 | Premium Gym & Sports Equipment Store in Bangladesh" 
        description="Gazi Sports 24 is the leading online store for gym accessories, sports equipment, fitness gear, and activewear at best prices in Bangladesh. Fast home delivery and Cash on Delivery." 
      />
      {/* ---- Hero Full-Width Banner (Permanent) ---- */}
      <section className="hero-carousel-fullscreen">
        <div className="fullscreen-slides">
          <div 
            className="fullscreen-slide has-image" 
            style={{ 
              background: `url(/assets/main-banner.webp) center/cover no-repeat`,
              width: '100%'
            }}
          />
        </div>
      </section>

      {/* ---- Announcement Bar Removed ---- */}

      {/* ---- Shop Now Link to All Products ---- */}
      <div className="homepage-shop-now-row" style={{ display: 'flex', justifyContent: 'center', margin: '40px 0 16px 0' }}>
        <Link to="/collection/all" className="store-btn store-btn-primary" style={{ padding: '14px 40px', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Shop Now &rarr;
        </Link>
      </div>

      {/* ---- Categories ---- */}
      <section className="store-section" id="categories" style={{ paddingTop: 0, paddingBottom: '24px' }}>
        <div className="store-section-header" style={{ justifyContent: 'center', textAlign: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="store-section-title" style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>— Featured Categories —</h2>
          </div>
        </div>
        <div className="categories-grid">
          {categories.map((cat, i) => {
            const Icon = ICON_MAP[cat.icon] || Grid3X3;
            const categorySlug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const categoryUrl = `/collection/${categorySlug}`;
            
            // Find all published products for this category
            const categoryProducts = config.products.filter(p => p.published && p.category === cat.name);
            // Get last product image
            const lastProductImage = categoryProducts.length > 0 ? categoryProducts[categoryProducts.length - 1].image : '';
            // Determine displayed category image (custom image if enabled, else last added product image)
            const displayCategoryCardImage = (cat.useCustomImage && cat.image && cat.image.trim()) ? cat.image : lastProductImage;

            return (
              <Link 
                to={categoryUrl}
                key={i} 
                className="category-card"
                style={{ textDecoration: 'none' }}
              >
                <div className="category-image-container">
                  {displayCategoryCardImage ? (
                    <OptimizedImage src={displayCategoryCardImage} alt={cat.name} className="category-card-image" width={300} height={300} />
                  ) : (
                    <div className="category-icon-fallback"><Icon size={22} /></div>
                  )}
                </div>
                <div className="category-card-info">
                  <div className="category-name">{cat.name}</div>
                  <div className="category-count">{categoryProducts.length.toLocaleString()} products</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---- Popular This Week (Trending Products) Section ---- */}
      <section className="trending-products-section">
        <div className="trending-section-header">
          <h2 className="trending-section-title">Popular This Week</h2>
          <p className="trending-section-subtitle">Trending Now</p>
        </div>
        
        <div className="trending-products-grid">
          {trendingProducts.map(renderProductCard)}
        </div>
      </section>

      {/* ---- New Arrivals Section ---- */}
      <section className="new-arrivals-section">
        <div className="new-arrivals-header">
          <p className="new-arrivals-subtitle">LET'S SHOP</p>
          <h2 className="new-arrivals-title">New Arrivals</h2>
        </div>
        
        <div className="new-arrivals-grid">
          {newArrivalProducts.map(renderProductCard)}
        </div>
      </section>

      {/* ---- Middle Promo Banners ---- */}
      {config.middleBanners && config.middleBanners.length > 0 && (
        <section className="middle-promo-banner-section" style={{ padding: '0 24px 60px', maxWidth: 'var(--sf-max-width)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {config.middleBanners.filter(b => b.enabled && b.image).map((banner) => (
            banner.link ? (
              <Link to={banner.link} key={banner.id}>
                <img 
                  src={banner.image} 
                  alt="Promo Banner" 
                  style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block', cursor: 'pointer', transition: 'transform 0.3s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} 
                  className="middle-promo-banner-img"
                />
              </Link>
            ) : (
              <img 
                src={banner.image} 
                alt="Promo Banner" 
                key={banner.id}
                style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} 
                className="middle-promo-banner-img"
              />
            )
          ))}
        </section>
      )}

      {/* ---- All Campaigns Trigger & Modal Removed ---- */}


  </>
  );
}


