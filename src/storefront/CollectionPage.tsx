import { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Star, Heart, ShoppingCart, ChevronRight, Clock, ArrowLeft, Zap, SlidersHorizontal, List, X, Search } from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { OptimizedImage } from '../components/layout/OptimizedImage';

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

function CountdownTimer({ startDate, endDate, startLabel, label, isLarge }: { startDate?: string; endDate?: string; startLabel?: string; label: string; isLarge?: boolean }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isUpcoming: false, expired: false });

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      if (!endDate) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isUpcoming: false, expired: true }); return; }
      const end = new Date(endDate).getTime();
      if (isNaN(end)) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isUpcoming: false, expired: true }); return; }
      if (startDate && now < start) {
        const diff = start - now;
        setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), isUpcoming: true, expired: false });
        return;
      }
      const diff = end - now;
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isUpcoming: false, expired: true }); return; }
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), isUpcoming: false, expired: false });
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [startDate, endDate]);

  if (timeLeft.expired) return (
    <div className={`collection-timer expired ${isLarge ? 'large' : ''}`}>
      <Clock size={18} /><span className="collection-timer-label">This offer has ended</span>
    </div>
  );

  const activeLabel = timeLeft.isUpcoming ? (startLabel || 'Offer starts in') : (label || 'Offer ends in');
  return (
    <div className={`collection-timer ${timeLeft.isUpcoming ? 'upcoming' : ''} ${isLarge ? 'large' : ''}`}>
      <Clock size={18} className="timer-icon" />
      <span className="collection-timer-label">{activeLabel}</span>
      <div className="collection-timer-digits">
        <div className="timer-unit"><span className="timer-value">{String(timeLeft.days).padStart(2, '0')}</span><span className="timer-label-sm">Days</span></div>
        <span className="timer-sep">:</span>
        <div className="timer-unit"><span className="timer-value">{String(timeLeft.hours).padStart(2, '0')}</span><span className="timer-label-sm">Hrs</span></div>
        <span className="timer-sep">:</span>
        <div className="timer-unit"><span className="timer-value">{String(timeLeft.minutes).padStart(2, '0')}</span><span className="timer-label-sm">Min</span></div>
        <span className="timer-sep">:</span>
        <div className="timer-unit"><span className="timer-value">{String(timeLeft.seconds).padStart(2, '0')}</span><span className="timer-label-sm">Sec</span></div>
      </div>
    </div>
  );
}

export { CountdownTimer };

interface DualRangeSliderProps {
  min: number; max: number; valueMin: number; valueMax: number;
  onChangeMin: (val: number) => void; onChangeMax: (val: number) => void;
}

function DualRangeSlider({ min, max, valueMin, valueMax, onChangeMin, onChangeMax }: DualRangeSliderProps) {
  const percentMin = max === min ? 0 : ((valueMin - min) / (max - min)) * 100;
  const percentMax = max === min ? 100 : ((valueMax - min) / (max - min)) * 100;
  return (
    <div className="dual-range-slider-container">
      <div className="slider-track" />
      <div className="slider-range-highlight" style={{ left: `${percentMin}%`, width: `${percentMax - percentMin}%` }} />
      <input type="range" min={min} max={max === min ? max + 1000 : max} value={valueMin}
        onChange={e => onChangeMin(Math.min(Number(e.target.value), valueMax - 1))}
        className="thumb thumb-left" style={{ zIndex: valueMin > max - 100 ? 5 : 3 }} />
      <input type="range" min={min} max={max === min ? max + 1000 : max} value={valueMax}
        onChange={e => onChangeMax(Math.max(Number(e.target.value), valueMin + 1))}
        className="thumb thumb-right" style={{ zIndex: 4 }} />
    </div>
  );
}

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, toggleWishlist, wishlist, searchQuery } = useOutletContext<any>();
  const [config, , configReady] = useStorefrontConfig();

  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [priceFilterMin, setPriceFilterMin] = useState(0);
  const [appliedPriceMin, setAppliedPriceMin] = useState(0);
  const [priceFilterMax, setPriceFilterMax] = useState(30000);
  const [appliedPriceMax, setAppliedPriceMax] = useState(30000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const products = config.products.filter(p => p.published);

  // Find the matching nav link by slug
  let navLink = config.navLinks.find(n => {
    const labelSlug = n.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const urlParts = n.url.split('/').filter(Boolean);
    const urlSlug = urlParts[urlParts.length - 1]?.replace(/^#/, '') || '';
    const urlSlugNorm = urlSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slugNorm = (slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return urlSlug === slug || urlSlugNorm === slugNorm || labelSlug === slugNorm;
  });

  // Fallback to Category config
  const categoryConfig = config.categories.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === slug);
  if (!navLink && categoryConfig) {
    navLink = {
      id: categoryConfig.id + 1000,
      label: categoryConfig.name,
      url: `/collection/${slug}`,
      enabled: categoryConfig.published,
      productIds: products.filter(p => p.category === categoryConfig.name).map(p => p.id)
    };
  }

  if (!navLink && (slug === 'most-selling' || slug === 'trending')) {
    const isMostSelling = slug === 'most-selling';
    const ids = isMostSelling ? (config.mostSellingProductIds || []) : (config.trendingProductIds || []);
    navLink = { id: isMostSelling ? 8888 : 9999, label: isMostSelling ? 'Most Selling' : 'Trending', url: `/collection/${slug}`, enabled: true, productIds: ids };
  }

  const isAllProductsPage = slug === 'all' || slug === 'all-products' || slug === 'shop' || (navLink && ['shop', 'shop all', 'shop-all'].includes((navLink.label || '').toLowerCase()));

  if ((!navLink || !navLink.productIds || navLink.productIds.length === 0) && isAllProductsPage) {
    navLink = {
      id: navLink?.id || 7777,
      label: navLink?.label || 'All Products',
      url: navLink?.url || `/collection/${slug}`,
      enabled: true,
      productIds: products.map(p => p.id),
      timerEnabled: navLink?.timerEnabled,
      timerEndDate: navLink?.timerEndDate,
      timerStartDate: navLink?.timerStartDate,
      timerLabel: navLink?.timerLabel,
      timerStartLabel: navLink?.timerStartLabel
    };
  }

  const collectionProducts = (navLink ? (navLink.productIds || []) : [])
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter(Boolean) as any[];

  // All unique brands in this collection
  const allBrands = Array.from(
    new Set(collectionProducts.map(p => p.brand).filter(Boolean))
  ).sort() as string[];

  // Categories for pill bar - aligned with home page and admin configuration
  let categoriesConfig = config.categories
    .filter(c => c.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  let categoryNames = categoriesConfig.map(c => c.name);

  if (categoryNames.length === 0) {
    categoryNames = Array.from(new Set(products.map(p => p.category)));
  }

  const uniqueCategories = ['All', ...categoryNames];

  useEffect(() => {
    setSelectedCategory('All');
    setSortBy('default');
    setLocalSearch('');
    setSelectedBrands([]);
    setPriceFilterMin(0);
    setAppliedPriceMin(0);
    setPriceFilterMax(30000);
    setAppliedPriceMax(30000);
    const container = document.querySelector('.storefront-scroll-container');
    if (container) container.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [slug]);

  if (!configReady) {
    return (
      <div className="collection-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--sf-text-tertiary)' }}>
          <div className="loading-spinner" style={{ border: '3px solid #f3f3f3', borderTop: '3px solid var(--sf-accent)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>লোড হচ্ছে...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!navLink) {
    return (
      <div className="collection-page">
        <div className="collection-empty">
          <h2>Collection not found</h2>
          <p>The collection you're looking for doesn't exist.</p>
          <Link to="/" className="store-btn store-btn-primary"><ArrowLeft size={16} /> Back to Store</Link>
        </div>
      </div>
    );
  }

  // Filter products
  let filteredProducts = collectionProducts;
  if (selectedCategory !== 'All') {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }
  const activeSearch = (localSearch || searchQuery || '').trim().toLowerCase();
  if (activeSearch) {
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(activeSearch) ||
      p.category.toLowerCase().includes(activeSearch) ||
      (p.brand && p.brand.toLowerCase().includes(activeSearch)) ||
      (p.description && p.description.toLowerCase().includes(activeSearch))
    );
  }
  filteredProducts = filteredProducts.filter(p => p.price >= appliedPriceMin && p.price <= appliedPriceMax);
  if (selectedBrands.length > 0) {
    filteredProducts = filteredProducts.filter(p => p.brand && selectedBrands.includes(p.brand));
  }

  // Sort
  if (sortBy === 'price-low') filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-high') filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  else if (sortBy === 'rating') filteredProducts = [...filteredProducts].sort((a, b) => b.rating - a.rating);

  const isPromoCollection = !!(navLink.timerEnabled && navLink.timerEndDate);

  const hasActiveFilters = selectedBrands.length > 0 || appliedPriceMin > 0 || appliedPriceMax < 30000 || localSearch;

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
              {hasDiscount && <span className="jersey-badge jersey-badge-discount">-{discountPercent}%</span>}
              {isSoldOut && <span className="jersey-badge jersey-badge-soldout">Sold out</span>}
            </div>
          </div>
          <div className="jersey-product-body">
            <h3 className="jersey-product-name">{product.name}</h3>
            <div className="jersey-product-price-row">
              {hasDiscount && <span className="jersey-product-original-price">Tk {product.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
              <span className="jersey-product-price">Tk {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </Link>
      );
    }

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
          {hasDiscount ? (
            <span className="trending-product-badge">-{discountPercent}%</span>
          ) : product.badge ? (
            <span className="trending-product-badge">{product.badge === 'sale' ? 'Sale!' : 'New'}</span>
          ) : null}
        </div>
        <div className="trending-product-body">
          <h3 className="trending-product-name">{product.name}</h3>
          <div className="trending-product-price-row">
            {hasDiscount && <span className="trending-product-original-price">৳ {product.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
            <span className="trending-product-price">৳ {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="trending-product-action-container">
            {hasOptions ? (
              <span className="trending-product-action-btn">
                <List size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Select options
              </span>
            ) : (
              <button className="trending-product-action-btn-raw" onClick={e => { e.preventDefault(); e.stopPropagation(); addToCart(product); }}>
                <ShoppingCart size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Add to cart
              </button>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className={`collection-page ${isPromoCollection ? 'promo-collection-page' : ''}`}>
      {/* Sidebar Overlay */}
      {isFilterSidebarOpen && (
        <div className="filter-sidebar-overlay" onClick={() => setIsFilterSidebarOpen(false)} />
      )}

      {/* Filter Sidebar */}
      <aside className={`filter-sidebar-panel${isFilterSidebarOpen ? ' open' : ''}`}>
        <div className="fsp-header">
          <span className="fsp-title">Filter</span>
          <button className="fsp-close" onClick={() => setIsFilterSidebarOpen(false)}><X size={18} /></button>
        </div>

        {/* Price Range */}
        <div className="fsp-section">
          <div className="fsp-section-title">Price Range</div>
          <div className="price-slider-wrapper-v2">
            <DualRangeSlider
              min={0} max={30000}
              valueMin={priceFilterMin} valueMax={priceFilterMax}
              onChangeMin={setPriceFilterMin} onChangeMax={setPriceFilterMax}
            />
          </div>
          <div className="fsp-price-labels">
            <span>৳{priceFilterMin.toLocaleString()}</span>
            <span>৳{priceFilterMax.toLocaleString()}</span>
          </div>
          <button className="fsp-apply-btn" onClick={() => { setAppliedPriceMin(priceFilterMin); setAppliedPriceMax(priceFilterMax); }}>
            Apply Price
          </button>
        </div>

        {/* Brand Filter */}
        {allBrands.length > 0 && (
          <div className="fsp-section">
            <div className="fsp-section-title">Brand</div>
            <div className="fsp-brand-list">
              {allBrands.map(brand => {
                const count = collectionProducts.filter(p => p.brand === brand).length;
                const isSelected = selectedBrands.includes(brand);
                return (
                  <label key={brand} className={`fsp-brand-item${isSelected ? ' checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) setSelectedBrands(selectedBrands.filter(b => b !== brand));
                        else setSelectedBrands([...selectedBrands, brand]);
                      }}
                    />
                    <span className="fsp-brand-name">{brand}</span>
                    <span className="fsp-brand-count">({count})</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear All */}
        {(selectedBrands.length > 0 || appliedPriceMin > 0 || appliedPriceMax < 30000) && (
          <button className="fsp-clear-btn" onClick={() => { setSelectedBrands([]); setPriceFilterMin(0); setAppliedPriceMin(0); setPriceFilterMax(30000); setAppliedPriceMax(30000); }}>
            Clear All Filters
          </button>
        )}
      </aside>

      {/* Breadcrumb */}
      <nav className="collection-breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} />
        <span>{navLink.label}</span>
      </nav>

      {isPromoCollection ? (
        <div className="collection-hero-banner">
          <div className="collection-hero-mesh" />
          <div className="collection-hero-content">
            <div className="collection-hero-tag"><Zap size={14} /> Exclusive Offers</div>
            <h1 className="collection-hero-title">{navLink.label}</h1>
            <p className="collection-hero-subtitle">Enjoy limited-time discounts on selected items.</p>
            <div className="collection-hero-timer">
              <CountdownTimer startDate={navLink.timerStartDate} endDate={navLink.timerEndDate} startLabel={navLink.timerStartLabel} label={navLink.timerLabel || 'Offer ends in'} isLarge={true} />
            </div>
          </div>
        </div>
      ) : (
        <div className="splayd-section-heading">
          <h2 className="splayd-section-title">{navLink.label.toUpperCase()}</h2>
        </div>
      )}

      {/* Category Pill Bar */}
      {uniqueCategories.length > 1 && (
        <div className="collection-cat-pill-bar">
          {uniqueCategories.map(cat => {
            const count = cat === 'All' ? collectionProducts.length : collectionProducts.filter(p => p.category === cat).length;
            return (
              <button key={cat} className={`collection-cat-pill${selectedCategory === cat ? ' active' : ''}`} onClick={() => setSelectedCategory(cat)}>
                {cat}<span className="collection-cat-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter / Sort Bar */}
      {collectionProducts.length > 0 && (
        <div className="splayd-filter-bar">
          <div className="splayd-filter-left">
            <button className={`splayd-filter-toggle${isFilterSidebarOpen ? ' active' : ''}`} onClick={() => setIsFilterSidebarOpen(v => !v)}>
              <SlidersHorizontal size={14} />
              Filter
              {hasActiveFilters && <span className="fsp-active-dot" />}
            </button>
            {/* Active badges */}
            {selectedBrands.map(brand => (
              <span className="splayd-active-badge" key={brand}>
                {brand}
                <button onClick={() => setSelectedBrands(selectedBrands.filter(b => b !== brand))}><X size={10} /></button>
              </span>
            ))}
            {(appliedPriceMin > 0 || appliedPriceMax < 30000) && (
              <span className="splayd-active-badge">
                ৳{appliedPriceMin.toLocaleString()} – ৳{appliedPriceMax.toLocaleString()}
                <button onClick={() => { setPriceFilterMin(0); setAppliedPriceMin(0); setPriceFilterMax(30000); setAppliedPriceMax(30000); }}><X size={10} /></button>
              </span>
            )}
            {hasActiveFilters && (
              <button className="splayd-clear-btn" onClick={() => { setSelectedBrands([]); setPriceFilterMin(0); setAppliedPriceMin(0); setPriceFilterMax(30000); setAppliedPriceMax(30000); setLocalSearch(''); }}>
                Clear all
              </button>
            )}
          </div>
          <div className="splayd-filter-right">
            <span className="splayd-result-count">{filteredProducts.length} products</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="splayd-sort-select">
              <option value="default">Featured</option>
              <option value="price-low">Price ↑</option>
              <option value="price-high">Price ↓</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="splayd-products-grid">
          {filteredProducts.map(renderProductCard)}
        </div>
      ) : (
        <div className="collection-empty">
          <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3>No products found</h3>
          <p>Try adjusting your filters or browse all products.</p>
        </div>
      )}
    </div>
  );
}
