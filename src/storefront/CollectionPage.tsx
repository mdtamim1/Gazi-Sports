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
      
      if (!endDate) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isUpcoming: false, expired: true });
        return;
      }
      const end = new Date(endDate).getTime();
      if (isNaN(end)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isUpcoming: false, expired: true });
        return;
      }

      // Check if the timer is in the upcoming phase
      if (startDate && now < start) {
        const diff = start - now;
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
          isUpcoming: true,
          expired: false,
        });
        return;
      }

      // Check if the timer is in the active running phase
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isUpcoming: false, expired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isUpcoming: false,
        expired: false,
      });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [startDate, endDate]);

  if (timeLeft.expired) {
    return (
      <div className={`collection-timer expired ${isLarge ? 'large' : ''}`}>
        <Clock size={18} />
        <span className="collection-timer-label">This offer has ended</span>
      </div>
    );
  }

  const activeLabel = timeLeft.isUpcoming ? (startLabel || 'Offer starts in') : (label || 'Offer ends in');

  return (
    <div className={`collection-timer ${timeLeft.isUpcoming ? 'upcoming' : ''} ${isLarge ? 'large' : ''}`}>
      <Clock size={18} className="timer-icon" />
      <span className="collection-timer-label">{activeLabel}</span>
      <div className="collection-timer-digits">
        <div className="timer-unit">
          <span className="timer-value">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="timer-label-sm">Days</span>
        </div>
        <span className="timer-sep">:</span>
        <div className="timer-unit">
          <span className="timer-value">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="timer-label-sm">Hrs</span>
        </div>
        <span className="timer-sep">:</span>
        <div className="timer-unit">
          <span className="timer-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="timer-label-sm">Min</span>
        </div>
        <span className="timer-sep">:</span>
        <div className="timer-unit">
          <span className="timer-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="timer-label-sm">Sec</span>
        </div>
      </div>
    </div>
  );
}

export { CountdownTimer };

interface DualRangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (val: number) => void;
  onChangeMax: (val: number) => void;
}

function DualRangeSlider({ min, max, valueMin, valueMax, onChangeMin, onChangeMax }: DualRangeSliderProps) {
  const percentMin = max === min ? 0 : ((valueMin - min) / (max - min)) * 100;
  const percentMax = max === min ? 100 : ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="dual-range-slider-container">
      <div className="slider-track" />
      <div 
        className="slider-range-highlight" 
        style={{
          left: `${percentMin}%`,
          width: `${percentMax - percentMin}%`
        }}
      />
      <input
        type="range"
        min={min}
        max={max === min ? max + 1000 : max}
        value={valueMin}
        onChange={(e) => {
          const val = Math.min(Number(e.target.value), valueMax - 1);
          onChangeMin(val);
        }}
        className="thumb thumb-left"
        style={{ zIndex: valueMin > max - 100 ? 5 : 3 }}
      />
      <input
        type="range"
        min={min}
        max={max === min ? max + 1000 : max}
        value={valueMax}
        onChange={(e) => {
          const val = Math.max(Number(e.target.value), valueMin + 1);
          onChangeMax(val);
        }}
        className="thumb thumb-right"
        style={{ zIndex: 4 }}
      />
    </div>
  );
}

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, toggleWishlist, wishlist, searchQuery } = useOutletContext<any>();
  const [config] = useStorefrontConfig();

  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [priceFilterMin, setPriceFilterMin] = useState(0);
  const [appliedPriceMin, setAppliedPriceMin] = useState(0);
  const [priceFilterMax, setPriceFilterMax] = useState(100000);
  const [appliedPriceMax, setAppliedPriceMax] = useState(100000);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const products = config.products.filter(p => p.published);
  const popularProducts = [...products].sort((a, b) => b.rating - a.rating).slice(0, 3);

  // Find the matching nav link by slug (robust lookup by label-slug or url-slug)
  let navLink = config.navLinks.find(n => {
    const labelSlug = n.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const urlSlug = n.url.split('/').pop()?.replace('#', '');
    return urlSlug === slug || labelSlug === slug;
  });

  // Fallback to Category config if navLink is not found
  const categoryConfig = config.categories.find(c => {
    return c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === slug;
  });

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
    const ids = isMostSelling 
      ? (config.mostSellingProductIds || []) 
      : (config.trendingProductIds || []);
    
    navLink = {
      id: isMostSelling ? 8888 : 9999,
      label: isMostSelling ? 'Most Selling' : 'Trending',
      url: `/collection/${slug}`,
      enabled: true,
      productIds: ids
    };
  }

  if ((!navLink || !navLink.productIds || navLink.productIds.length === 0) && (slug === 'all' || slug === 'all-products' || slug === 'shop' || (navLink && ['shop', 'shop all', 'shop-all'].includes((navLink.label || '').toLowerCase())))) {
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

  const isAllProductsPage = slug === 'all' || slug === 'all-products' || slug === 'shop' || (navLink && ['shop', 'shop all', 'shop-all'].includes((navLink.label || '').toLowerCase()));

  const collectionProducts = (navLink ? (navLink.productIds || []) : [])
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter(Boolean) as any[];

  // Get dynamic min/max prices of products in this collection
  const collectionPrices = collectionProducts.map(p => p.price);
  const minPricePossible = collectionPrices.length > 0 ? Math.min(...collectionPrices) : 0;
  const maxPricePossible = collectionPrices.length > 0 ? Math.max(...collectionPrices) : 100000;

  // Helper for color assignment
  const getProductColors = (p: any): string[] => {
    const colors: string[] = [];
    const text = `${p.name} ${p.description || ''} ${p.brand || ''}`.toLowerCase();
    
    if (text.includes('black')) colors.push('Black');
    if (text.includes('white')) colors.push('White');
    if (text.includes('blue')) colors.push('Blue');
    if (text.includes('red')) colors.push('Red');
    if (text.includes('green')) colors.push('Green');
    if (text.includes('pink')) colors.push('Pink');
    if (text.includes('purple')) colors.push('Purple');
    if (text.includes('orange')) colors.push('Orange');
    if (text.includes('grey') || text.includes('gray')) colors.push('Grey');
    
    if (p.specs && Array.isArray(p.specs)) {
      p.specs.forEach((s: any) => {
        if (s.name && s.name.toLowerCase() === 'color') {
          const val = s.value;
          if (val && !colors.includes(val)) {
            colors.push(val);
          }
        }
      });
    }
    
    if (colors.length === 0) {
      const fallbackColors = ['Black', 'Blue', 'Green', 'Red', 'Pink', 'Purple', 'White'];
      const index = Math.abs(String(p.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % fallbackColors.length;
      colors.push(fallbackColors[index]);
    }
    
    return colors;
  };

  // Get all unique colors in this collection
  const allColors = Array.from(
    new Set(collectionProducts.flatMap(p => getProductColors(p)))
  ).sort();

  // Get categories from collection products dynamically
  const uniqueCategories = ['All', ...Array.from(new Set(collectionProducts.map(p => p.category)))];

  useEffect(() => {
    // Reset filters when collection changes
    setSelectedCategory('All');
    setSortBy('default');
    setLocalSearch('');
    setSelectedColors([]);
    setPriceFilterMin(minPricePossible);
    setAppliedPriceMin(minPricePossible);
    setPriceFilterMax(maxPricePossible);
    setAppliedPriceMax(maxPricePossible);
    
    // Explicitly reset storefront scroll container to top
    const container = document.querySelector('.storefront-scroll-container');
    if (container) {
      container.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [slug, minPricePossible, maxPricePossible]);

  if (!navLink) {
    return (
      <div className="collection-page">
        <div className="collection-empty">
          <h2>Collection not found</h2>
          <p>The collection you're looking for doesn't exist.</p>
          <Link to="/" className="store-btn store-btn-primary">
            <ArrowLeft size={16} /> Back to Store
          </Link>
        </div>
      </div>
    );
  }

  // Filter products
  let filteredProducts = collectionProducts;
  if (isAllProductsPage) {
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
    if (selectedColors.length > 0) {
      filteredProducts = filteredProducts.filter(p => {
        const pColors = getProductColors(p);
        return selectedColors.some(c => pColors.includes(c));
      });
    }
  }

  // Sort products
  if (sortBy === 'price-low') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.rating - a.rating);
  }

  const isPromoCollection = !!(navLink.timerEnabled && navLink.timerEndDate);

  const renderProductCard = (product: any) => {
    const isJersey = product.category && (product.category.toLowerCase() === 'jersey' || product.category.toLowerCase() === 'jerseys');
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    
    if (isJersey) {
      const isSoldOut = !product.inStock || (product.stock !== undefined && product.stock <= 0);
      return (
        <Link to={`/product/${product.id}`} key={product.id} className="jersey-product-card" style={{ textDecoration: 'none' }}>
          <div className="jersey-product-image-container">
            <OptimizedImage src={product.image} alt={product.name} className="jersey-product-image" width={400} height={533} />
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

    const hasOptions = product.sizes && product.sizes.some((s: any) => s.enabled);
    return (
      <Link to={`/product/${product.id}`} key={product.id} className="trending-product-card" style={{ textDecoration: 'none' }}>
        <div className="trending-product-image-container">
          <OptimizedImage src={product.image} alt={product.name} className="trending-product-image" width={400} height={400} />
          {hasDiscount ? (
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
            {hasOptions ? (
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

  return (
    <div className={`collection-page ${isPromoCollection ? 'promo-collection-page' : ''}`}>
      {/* Breadcrumb */}
      <nav className="collection-breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} />
        <span>{navLink.label}</span>
      </nav>

      {isPromoCollection ? (
        /* PREMIUM IMMERSIVE HERO BANNER FOR TIMED OFFERS */
        <div className="collection-hero-banner">
          <div className="collection-hero-mesh" />
          <div className="collection-hero-content">
            <div className="collection-hero-tag">
              <Zap size={14} /> Exclusive Offers
            </div>
            <h1 className="collection-hero-title">{navLink.label}</h1>
            <p className="collection-hero-subtitle">
              Enjoy limited-time discounts on selected items. Handpicked deals for a premium shopping experience.
            </p>
            
            <div className="collection-hero-timer">
              <CountdownTimer
                startDate={navLink.timerStartDate}
                endDate={navLink.timerEndDate}
                startLabel={navLink.timerStartLabel}
                label={navLink.timerLabel || 'Offer ends in'}
                isLarge={true}
              />
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD HEADER */
        <div className="collection-header">
          <div className="collection-header-text">
            <h1 className="collection-title">{navLink.label}</h1>
            <p className="collection-subtitle">
              Explore our premium {navLink.label.toLowerCase()} collection — {collectionProducts.length} products
            </p>
          </div>
        </div>
      )}

      {/* Trust Badges Banner */}
      {isPromoCollection && (
        <div className="promo-trust-banner">
          <div className="trust-item">
            <span className="trust-icon">🚚</span>
            <div className="trust-text">
              <strong>Free Fast Delivery</strong>
              <p>On orders above ৳৫০০০</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🛡️</span>
            <div className="trust-text">
              <strong>100% Genuine</strong>
              <p>Verified seller items</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🔄</span>
            <div className="trust-text">
              <strong>Easy Returns</strong>
              <p>7-day hassle-free refund</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Area */}
      {isAllProductsPage ? (
        <div className="collection-main-layout">
          
          {/* Mobile Filter Sidebar Backdrop overlay */}
          {isFilterSidebarOpen && (
            <div className="collection-sidebar-overlay" onClick={() => setIsFilterSidebarOpen(false)} />
          )}

          {/* Sidebar Component (Desktop persistent, Mobile Slide-in Drawer) */}
          <aside className={`collection-sidebar ${isFilterSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <h3>Filter Products</h3>
              <button className="sidebar-close-btn" onClick={() => setIsFilterSidebarOpen(false)} title="Close filters">
                <X size={18} />
              </button>
            </div>

            <div className="sidebar-body">
              {/* 1. Search Box */}
              <div className="filter-search-box-v2">
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="filter-search-input-v2"
                />
                <Search size={16} className="filter-search-icon-v2" />
              </div>

              {/* 2. Categories List */}
              <div className="filter-section-v2">
                <h4 className="filter-title-v2">Categories</h4>
                <ul className="filter-list-v2">
                  {uniqueCategories.map(cat => {
                    const count = cat === 'All' 
                      ? collectionProducts.length 
                      : collectionProducts.filter(p => p.category === cat).length;
                    return (
                      <li key={cat}>
                        <button 
                          className={`filter-item-btn-v2 ${selectedCategory === cat ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsFilterSidebarOpen(false);
                          }}
                        >
                          <span className="category-name-v2">{cat}</span>
                          <span className="category-count-v2">({count})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* 3. Price Slider */}
              <div className="filter-section-v2">
                <h4 className="filter-title-v2">Filter By</h4>
                <div className="price-slider-wrapper-v2">
                  <DualRangeSlider
                    min={minPricePossible}
                    max={maxPricePossible}
                    valueMin={priceFilterMin}
                    valueMax={priceFilterMax}
                    onChangeMin={setPriceFilterMin}
                    onChangeMax={setPriceFilterMax}
                  />
                  <button 
                    className="filter-apply-btn-v2"
                    onClick={() => {
                      setAppliedPriceMin(priceFilterMin);
                      setAppliedPriceMax(priceFilterMax);
                      setIsFilterSidebarOpen(false);
                    }}
                  >
                    Filter
                  </button>
                  <div className="price-range-labels-v2">
                    <span>Price: ৳ {priceFilterMin.toLocaleString('en-US')} — ৳ {priceFilterMax.toLocaleString('en-US')}</span>
                  </div>
                </div>
              </div>

              {/* 4. Color Filters */}
              {allColors.length > 0 && (
                <div className="filter-section-v2">
                  <h4 className="filter-title-v2">Color</h4>
                  <ul className="filter-list-v2">
                    {allColors.map(color => {
                      const count = collectionProducts.filter(p => getProductColors(p).includes(color)).length;
                      const isSelected = selectedColors.includes(color);
                      return (
                        <li key={color}>
                          <button 
                            className={`filter-item-btn-v2 ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedColors(selectedColors.filter(c => c !== color));
                              } else {
                                setSelectedColors([...selectedColors, color]);
                              }
                            }}
                          >
                            <span className="category-name-v2">{color}</span>
                            <span className="category-count-v2">({count})</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* 5. Products Widget */}
              {popularProducts.length > 0 && (
                <div className="filter-section-v2">
                  <h4 className="filter-title-v2">Products</h4>
                  <div className="sidebar-popular-products-v2">
                    {popularProducts.map(product => {
                      const hasDiscount = product.originalPrice && product.originalPrice > product.price;
                      return (
                        <Link to={`/product/${product.id}`} key={product.id} className="sidebar-product-card-v2" style={{ textDecoration: 'none' }}>
                          <OptimizedImage src={product.image} alt={product.name} className="sidebar-product-image-v2" width={60} height={60} />
                          <div className="sidebar-product-info-v2">
                            <h5 className="sidebar-product-name-v2">{product.name}</h5>
                            <StarRating rating={product.rating} />
                            <div className="sidebar-product-price-v2">
                              {hasDiscount && (
                                <span className="sidebar-product-original-price-v2">
                                  ৳{product.originalPrice?.toLocaleString('en-US')}
                                </span>
                              )}
                              <span className="sidebar-product-current-price-v2">
                                ৳{product.price.toLocaleString('en-US')}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Products Grid Content Column */}
          <div className="collection-content-column">
            {/* Filter and Sorting Control Bar */}
            {collectionProducts.length > 0 && (
              <div className="collection-toolbar">
                {/* Mobile Filter Button */}
                <button 
                  className="mobile-filter-btn" 
                  onClick={() => setIsFilterSidebarOpen(true)}
                >
                  <SlidersHorizontal size={14} />
                  <span>Filter By</span>
                </button>

                {/* Active Category Display (or fallback text) */}
                <div className="category-status-indicator">
                  {selectedCategory !== 'All' ? (
                    <span>Showing products in: <strong>{selectedCategory}</strong></span>
                  ) : (
                    <span>Showing all products</span>
                  )}
                </div>

                {/* Sorting Dropdown */}
                <div className="sort-control">
                  <span>Sort by:</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                    <option value="default">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating: High to Low</option>
                  </select>
                </div>
              </div>
            )}

            {/* Active Filter Badges */}
            {(selectedCategory !== 'All' || selectedColors.length > 0 || appliedPriceMin > minPricePossible || appliedPriceMax < maxPricePossible || localSearch) && (
              <div className="active-filters-row">
                {selectedCategory !== 'All' && (
                  <span className="active-filter-badge">
                    Category: {selectedCategory}
                    <button onClick={() => setSelectedCategory('All')}><X size={12} /></button>
                  </span>
                )}
                {localSearch && (
                  <span className="active-filter-badge">
                    Search: "{localSearch}"
                    <button onClick={() => setLocalSearch('')}><X size={12} /></button>
                  </span>
                )}
                {(appliedPriceMin > minPricePossible || appliedPriceMax < maxPricePossible) && (
                  <span className="active-filter-badge">
                    Price: ৳{appliedPriceMin.toLocaleString('en-US')} — ৳{appliedPriceMax.toLocaleString('en-US')}
                    <button onClick={() => {
                      setPriceFilterMin(minPricePossible);
                      setAppliedPriceMin(minPricePossible);
                      setPriceFilterMax(maxPricePossible);
                      setAppliedPriceMax(maxPricePossible);
                    }}><X size={12} /></button>
                  </span>
                )}
                {selectedColors.map(color => (
                  <span className="active-filter-badge" key={color}>
                    Color: {color}
                    <button onClick={() => setSelectedColors(selectedColors.filter(c => c !== color))}><X size={12} /></button>
                  </span>
                ))}
                <button 
                  className="clear-all-filters-btn"
                  onClick={() => {
                    setSelectedCategory('All');
                    setLocalSearch('');
                    setSelectedColors([]);
                    setPriceFilterMin(minPricePossible);
                    setAppliedPriceMin(minPricePossible);
                    setPriceFilterMax(maxPricePossible);
                    setAppliedPriceMax(maxPricePossible);
                  }}
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="products-grid collection-products-grid">
                {filteredProducts.map(renderProductCard)}
              </div>
            ) : (
              <div className="collection-empty" style={{ padding: '80px 24px' }}>
                <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <h3>No products found</h3>
                <p>No products match your filter selections in this collection.</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Standard Layout (Single column, no sidebar) */
        <div className="collection-standard-layout" style={{ marginTop: '24px' }}>
          {/* Filter and Sorting Control Bar */}
          {collectionProducts.length > 0 && (
            <div className="collection-toolbar" style={{ justifyContent: 'flex-end', display: 'flex', marginBottom: '16px' }}>
              {/* Sorting Dropdown */}
              <div className="sort-control">
                <span>Sort by:</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                  <option value="default">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Rating: High to Low</option>
                </select>
              </div>
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="products-grid collection-products-grid">
              {filteredProducts.map(renderProductCard)}
            </div>
          ) : (
            <div className="collection-empty" style={{ padding: '80px 24px' }}>
              <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3>No products found</h3>
              <p>No products found in this collection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
