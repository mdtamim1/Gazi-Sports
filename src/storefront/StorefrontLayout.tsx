import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Zap, X, Minus, Plus, Phone, Mail, Menu, Home, MoreVertical, ArrowRight, Shield, Truck, RotateCcw, ChevronDown } from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import './storefront.css';
import { replaceContactInfo } from '../utils/storefrontUtils';
import { useCustomerAuth } from '../context/CustomerAuthContext';

import { OptimizedImage } from '../components/layout/OptimizedImage';

interface CartItem {
  product: any;
  quantity: number;
}

const RunnerIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="22" 
    height="22" 
    fill="currentColor" 
    style={{ 
      color: 'var(--sf-accent)', 
      marginLeft: '4px', 
      display: 'inline-block', 
      verticalAlign: 'middle',
      transform: 'scaleX(-1)'
    }}
  >
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 21.5c-.1.5.2 1 .7 1.1.5.1 1-.2 1.1-.7l2.8-12.2 2.9 2.9V21c0 .6.4 1 1 1s1-.4 1-1v-8.8c0-.3-.1-.5-.3-.7l-3.3-3.3 1.2-5.9c.7 1.2 2 2 3.5 2 .6 0 1-.4 1-1s-.4-1-1-1c-1.8 0-3.3-1.2-3.8-2.9-.2-.7-.8-1.2-1.6-1.2h-.4c-.7 0-1.3.4-1.6 1L6.2 10H3c-.6 0-1 .4-1 1s.4 1 1 1h3.7c.5 0 .9-.3 1.1-.7l2-2.4z"/>
  </svg>
);

const CustomLogo = () => (
  <div className="store-custom-logo">
    <div className="logo-main">
      <span className="logo-word-1">GAZI</span>
      <span className="logo-word-2">SPORTS <RunnerIcon /></span>
    </div>
    <div className="logo-sub">PLAY HARD SHOP SMART</div>
  </div>
);

export default function StorefrontLayout() {
  const [config] = useStorefrontConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { customer } = useCustomerAuth();

  // Filter enabled announcements
  const announcements = config.announcements.filter(a => a.enabled);
  // Filter enabled nav links and dynamically normalize collection links
  const navLinks = config.navLinks
    .filter(n => n.enabled && !['offers', 'offer', 'deals', 'deal'].includes((n.label || '').toLowerCase()))
    .map(link => {
      if (link.customPageContent) {
        return { ...link, url: `/page/${link.id}` };
      }
      let url = link.url;
      if (url.startsWith('/store/')) {
        url = url.replace('/store/', '/');
      } else if (url === '/store' || url === '') {
        url = '/';
      }
      const labelLower = (link.label || '').toLowerCase();
      if (labelLower === 'home') {
        url = '/';
      } else if (labelLower === 'offers' || labelLower === 'offer') {
        url = '/collection/offers';
      } else if (labelLower === 'new arrivals' || labelLower === 'new arrival') {
        url = '/collection/new-arrivals';
      } else if (labelLower === 'popular order' || labelLower === 'popular') {
        url = '/collection/popular-order';
      }
      return { ...link, url };
    });

  // Branding
  const branding = config.branding;

  // Footer columns (with normalized links, excluding Quick Links)
  const footerColumns = config.footerColumns
    .filter(col => col.title !== 'Quick Links')
    .map(col => ({
      ...col,
      links: col.links.filter(l => l.enabled).map(link => {
      if (link.customPageContent) {
        const labelLower = (link.label || '').toLowerCase();
        if (labelLower === 'privacy policy') {
          return { ...link, url: '/privacy-policy' };
        } else if (labelLower === 'terms of service' || labelLower === 'terms and service') {
          return { ...link, url: '/terms-of-service' };
        } else if (labelLower === 'about us' || labelLower === 'about') {
          return { ...link, url: '/about-us' };
        }
        return { ...link, url: `/page/${link.id}` };
      }
      let url = link.url;
      if (url.startsWith('/store/')) {
        url = url.replace('/store/', '/');
      } else if (url === '/store' || url === '') {
        url = '/';
      }
      const labelLower = (link.label || '').toLowerCase();
      if (labelLower === 'home' || labelLower === 'shop all') {
        url = '/';
      } else if (labelLower === 'new arrivals' || labelLower === 'new arrival') {
        url = '/collection/new-arrivals';
      } else if (labelLower === 'offers' || labelLower === 'offer' || labelLower === 'sale') {
        url = '/collection/offers';
      } else if (labelLower === 'popular order' || labelLower === 'popular') {
        url = '/collection/popular-order';
      }
      return { ...link, url };
    }),
  }));

  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlist, setWishlist] = useState<number[]>([]);

  // Load cart and wishlist from localStorage on mount and when customer changes
  useEffect(() => {
    const cartKey = customer ? `cart_${customer.id}` : 'cart_guest';
    const wishlistKey = customer ? `wishlist_${customer.id}` : 'wishlist_guest';
    
    // Load Cart
    const storedCart = localStorage.getItem(cartKey);
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        setCart([]);
      }
    } else {
      setCart([]);
    }

    // Load Wishlist
    const storedWishlist = localStorage.getItem(wishlistKey);
    if (storedWishlist) {
      try {
        setWishlist(JSON.parse(storedWishlist));
      } catch (e) {
        setWishlist([]);
      }
    } else {
      setWishlist([]);
    }
  }, [customer]);

  // Save Cart to localStorage when it changes
  useEffect(() => {
    const cartKey = customer ? `cart_${customer.id}` : 'cart_guest';
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, customer]);

  // Save Wishlist to localStorage when it changes
  useEffect(() => {
    const wishlistKey = customer ? `wishlist_${customer.id}` : 'wishlist_guest';
    localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
  }, [wishlist, customer]);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [mobileShopDropdownOpen, setMobileShopDropdownOpen] = useState(false);
  const shopDropdownRef = useRef<HTMLDivElement>(null);
  
  let categories = config.categories
    .filter(c => c.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (categories.length === 0) {
    const uniqueCategoryNames = Array.from(new Set(config.products.filter(p => p.published).map(p => p.category)));
    categories = uniqueCategoryNames.map((name, index) => ({
      id: index + 1,
      name,
      icon: 'Grid3X3',
      count: config.products.filter(p => p.published && p.category === name).length,
      published: true,
      sortOrder: index + 1
    }));
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(e.target as Node)) {
        setShopDropdownOpen(false);
      }
    };
    if (shopDropdownOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [shopDropdownOpen]);

  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const [bottomNavVisible, setBottomNavVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isProductPage = location.pathname.startsWith('/product/');

  // Load active campaigns from localStorage
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('campaignList');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          const active = list.filter((c: any) => c.status === 'active');
          setActiveCampaigns(active);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const st = container.scrollTop;
      
      // Update scrolled state for transparent header
      if (isHome) {
        setScrolled(st > 50);
      } else {
        setScrolled(true);
      }

      // Hide/Show bottom navigation based on scroll direction
      const diff = st - lastScrollTopRef.current;
      if (diff > 15 && st > 100) {
        // Scrolling down -> hide bottom nav
        setBottomNavVisible(false);
      } else if (diff < -15 || st <= 20) {
        // Scrolling up or near top -> show bottom nav
        setBottomNavVisible(true);
      }
      lastScrollTopRef.current = st;
    };

    if (!isHome) {
      setScrolled(true);
    } else {
      setScrolled(container.scrollTop > 50);
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Scroll restoration and reset bottom nav on route changes
  useEffect(() => {
    setShopDropdownOpen(false);
    setMobileShopDropdownOpen(false);
    // Track PageView in Facebook Meta Pixel on SPA route navigation
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }

    const container = containerRef.current;
    if (container) {
      container.scrollTop = 0;
    }
    window.scrollTo(0, 0);

    // Timed fallbacks to handle lazy layout rendering and image size shifts
    const t1 = setTimeout(() => {
      if (container) container.scrollTop = 0;
      window.scrollTo(0, 0);
    }, 50);

    const t2 = setTimeout(() => {
      if (container) container.scrollTop = 0;
      window.scrollTo(0, 0);
    }, 150);

    setBottomNavVisible(true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (mobileSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // Background Auto-Sync for Offline Orders
  useEffect(() => {
    const syncOfflineOrders = async () => {
      const pending = localStorage.getItem('pending_sync_orders');
      if (!pending) return;

      try {
        const orders = JSON.parse(pending);
        if (Array.isArray(orders) && orders.length > 0) {
          console.log(`Found ${orders.length} offline orders pending sync...`);
          const remaining: any[] = [];
          
          // Dynamically import the api helper to prevent static dependency cycle
          const { sendOrderToBackend } = await import('../services/api');

          for (const order of orders) {
            const success = await sendOrderToBackend(order);
            if (!success) {
              remaining.push(order);
            }
          }

          if (remaining.length > 0) {
            localStorage.setItem('pending_sync_orders', JSON.stringify(remaining));
          } else {
            localStorage.removeItem('pending_sync_orders');
            console.log('All offline orders successfully synced to backend!');
          }
        }
      } catch (e) {
        console.error('Failed to sync offline orders:', e);
      }
    };

    // Run sync on mount, and then periodically check every 30 seconds
    const timeout = setTimeout(syncOfflineOrders, 5000);
    const interval = setInterval(syncOfflineOrders, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const clearCart = () => setCart([]);

  const addToCart = (product: any) => {
    // Track AddToCart in Facebook Meta Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'AddToCart', {
        content_name: product.name,
        content_category: product.category || 'Sports',
        content_ids: [String(product.id)],
        content_type: 'product',
        value: product.price,
        currency: 'BDT'
      });
    }

    const size = product.selectedSize || 'Free Size';
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && (item.product.selectedSize || 'Free Size') === size);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && (item.product.selectedSize || 'Free Size') === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (productId: number, sizeOrDelta: string | number, possibleDelta?: number) => {
    let size = 'Free Size';
    let delta = 0;
    if (typeof sizeOrDelta === 'string') {
      size = sizeOrDelta;
      delta = possibleDelta ?? 0;
    } else {
      delta = sizeOrDelta;
    }

    setCart(prev =>
      prev
        .map(item => {
          const itemSize = item.product.selectedSize || 'Free Size';
          const matchesProduct = item.product.id === productId;
          const matchesSize = typeof sizeOrDelta !== 'string' || itemSize === size;
          if (matchesProduct && matchesSize) {
            return { ...item, quantity: Math.max(0, item.quantity + delta) };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number, size?: string) => {
    setCart(prev =>
      prev.filter(item =>
        item.product.id !== productId ||
        (size !== undefined && (item.product.selectedSize || 'Free Size') !== size)
      )
    );
  };

  const toggleWishlist = (productId: number) => {
    setWishlist(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && !currentPath.startsWith('/collection')) {
      navigate('/');
    }
  };

  return (
    <div className="storefront">
      <div className={`store-sticky-header-container ${isHome && !scrolled ? 'header-transparent' : ''}`}>
        {/* ---- Header ---- */}
        <header className="store-header">
          {!mobileSearchOpen ? (
            <div className="store-header-inner-grid">
              {/* Left Action: Menu Toggle */}
              <div className="store-header-left">
                <button 
                  className="store-header-btn" 
                  onClick={() => setMobileMenuOpen(true)}
                  title="Open Menu"
                >
                  <Menu size={22} style={{ color: 'var(--sf-accent)' }} />
                </button>
              </div>

              {/* Center: Logo */}
              <div className="store-header-center">
                <Link to="/" className="store-logo">
                  <CustomLogo />
                </Link>
              </div>

              {/* Desktop Menu Links */}
              <nav className="store-header-nav desktop-only">
                {navLinks.map(link => {
                  const isShop = 
                    (link.label || '').toLowerCase().includes('shop') || 
                    (link.label || '').toLowerCase().includes('shоp') || 
                    (link.url || '').toLowerCase().endsWith('fitness-item') ||
                    link.id === 3;
                  if (isShop) {
                    return (
                      <div key={link.id} className="store-nav-shop-wrapper" ref={shopDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Link 
                          to={link.url} 
                          className="store-nav-link"
                          style={{ paddingRight: '4px' }}
                        >
                          {link.label}
                        </Link>
                        <button 
                          className="store-nav-dropdown-btn" 
                          onClick={(e) => {
                            e.preventDefault();
                            setShopDropdownOpen(!shopDropdownOpen);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'transform 0.2s ease',
                            transform: shopDropdownOpen ? 'rotate(180deg)' : 'none',
                            marginLeft: '-6px'
                          }}
                          title="View Categories"
                        >
                          <ChevronDown size={14} />
                        </button>
                        {shopDropdownOpen && (
                          <div className="store-nav-dropdown-menu">
                            {categories.map(cat => {
                              const categorySlug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                              return (
                                <Link
                                  key={cat.id}
                                  to={`/collection/${categorySlug}`}
                                  className="store-dropdown-item"
                                  onClick={() => setShopDropdownOpen(false)}
                                >
                                  {cat.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link 
                      key={link.id} 
                      to={link.url} 
                      className="store-nav-link"
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link to="/events" className="store-nav-link">
                  Events
                </Link>
              </nav>

              {/* Right Action: Search, Profile, Wishlist & Cart */}
              <div className="store-header-right">
                <button 
                  className="store-header-btn" 
                  onClick={() => setMobileSearchOpen(true)}
                  title="Search"
                >
                  <Search size={20} />
                </button>

                <Link 
                  to="/account" 
                  className="store-header-btn desktop-only" 
                  title="My Account"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <User size={20} />
                </Link>

                <button 
                  className="store-header-btn" 
                  title="Wishlist" 
                  onClick={() => setWishlistOpen(true)}
                  style={{ position: 'relative' }}
                >
                  <Heart size={20} />
                  {wishlist.length > 0 && (
                    <span className="cart-count" style={{ background: '#ef4444' }}>
                      {wishlist.length}
                    </span>
                  )}
                </button>

                <button 
                  className="store-header-btn" 
                  title="Cart" 
                  onClick={() => setCartOpen(true)}
                  style={{ position: 'relative' }}
                >
                  <ShoppingCart size={20} />
                  {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                </button>
              </div>
            </div>
          ) : (
            /* Full Width Search Bar Row (covers header logo & menu items completely) */
            <div className="store-header-search-bar-row">
              <form className="store-search-full" onSubmit={handleSearch}>
                <Search size={18} className="store-search-full-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products, brands, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: '16px' }}
                />
                <button
                  type="button"
                  className="store-search-close-btn"
                  onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }}
                  title="Close Search"
                >
                  <X size={20} />
                </button>

                {/* Search Suggestions Dropdown */}
                {searchQuery.trim().length >= 2 && (() => {
                  const q = searchQuery.toLowerCase().trim();
                  const suggestions = config.products
                    .filter(p => p.published && (
                      p.name.toLowerCase().includes(q) ||
                      p.category.toLowerCase().includes(q) ||
                      (p.brand && p.brand.toLowerCase().includes(q)) ||
                      (p.sku && p.sku.toLowerCase().includes(q))
                    ))
                    .slice(0, 6);

                  return (
                    <div className="store-search-suggestions">
                      {suggestions.length > 0 ? (
                        <>
                          <div className="store-search-suggestions-title">
                            {suggestions.length} টি পণ্য পাওয়া গেছে
                          </div>
                          {suggestions.map((product) => (
                            <div
                              key={product.id}
                              className="store-search-suggestion-item"
                              onClick={() => {
                                navigate(`/product/${product.id}`);
                                setSearchQuery('');
                                setMobileSearchOpen(false);
                              }}
                            >
                              <img
                                src={product.image}
                                alt={product.name}
                                className="store-search-suggestion-img"
                              />
                              <div className="store-search-suggestion-info">
                                <div className="store-search-suggestion-name">{product.name}</div>
                                <div className="store-search-suggestion-meta">
                                  {product.category} {product.brand ? `• ${product.brand}` : ''}
                                </div>
                              </div>
                              <div className="store-search-suggestion-price">
                                ৳{product.price}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="store-search-no-results">
                          "{searchQuery}" এর কোনো পণ্য পাওয়া যায়নি
                        </div>
                      )}
                    </div>
                  );
                })()}
              </form>
            </div>
          )}
        </header>
      </div>

      {/* ---- Scrollable Container ---- */}
      <div className="storefront-scroll-container" ref={containerRef}>
        {/* ---- Main Content Area ---- */}
        <main>
          <Outlet context={{ addToCart, toggleWishlist, wishlist, cart, cartTotal, clearCart, updateQuantity, searchQuery, setSearchQuery }} />
        </main>

        {/* ---- Footer ---- */}
        <footer className="store-footer">
          <div className="store-footer-inner">
            {/* Contact & Socials Column */}
            <div>
              <h4>Contact Us</h4>
              <ul className="store-footer-links" style={{ marginBottom: '16px' }}>
                {config.contactInfo.phoneNumber && (
                  <li>
                    <a href={`tel:${config.contactInfo.phoneNumber}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📞</span> {config.contactInfo.phoneNumber}
                    </a>
                  </li>
                )}
                {config.contactInfo.email && (
                  <li>
                    <a href={`mailto:${config.contactInfo.email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✉️</span> {config.contactInfo.email}
                    </a>
                  </li>
                )}
              </ul>
              <div className="store-footer-socials">
                {config.contactInfo.phoneNumber && (
                  <a href={`tel:${config.contactInfo.phoneNumber}`} className="social-btn phone" title="Call Us">
                    <Phone size={18} />
                  </a>
                )}
                {config.contactInfo.email && (
                  <a href={`mailto:${config.contactInfo.email}`} className="social-btn email" title="Email Us">
                    <Mail size={18} />
                  </a>
                )}
                {config.contactInfo.facebookUrl && (
                  <a href={config.contactInfo.facebookUrl} className="social-btn facebook" title="Facebook" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                    </svg>
                  </a>
                )}
                {config.contactInfo.whatsappNumber && (
                  <a href={`https://wa.me/${config.contactInfo.whatsappNumber}`} className="social-btn whatsapp" title="WhatsApp" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                )}
                {config.contactInfo.tiktokUrl && (
                  <a href={config.contactInfo.tiktokUrl} className="social-btn tiktok" title="TikTok" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.02 1.59 4.23.86.87 2 1.43 3.2 1.61.01 1.33.01 2.66 0 3.99-.99-.12-1.95-.53-2.74-1.15-.65-.54-1.12-1.25-1.38-2.04v7.91c.01 2.22-.84 4.39-2.38 5.96a7.712 7.712 0 01-7.85 1.89 7.64 7.64 0 01-4.7-5.06A7.818 7.818 0 017.065 7.6a7.716 7.716 0 018.3 3.2c-.01 1.43-.02 2.85-.02 4.28a3.528 3.528 0 00-4.04-1.22 3.6 3.6 0 00-2.28 3.32 3.524 3.524 0 003.54 3.52c1.94-.01 3.56-1.57 3.57-3.52q-.01-5.46-.01-10.92q-.3-.02-.6-.04z"/>
                    </svg>
                  </a>
                )}
                {config.contactInfo.instagramUrl && (
                  <a href={config.contactInfo.instagramUrl} className="social-btn instagram" title="Instagram" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {footerColumns.map((col, colIdx) => (
              <div key={colIdx}>
                <h4>{col.title}</h4>
                <ul className="store-footer-links">
                  {col.links.map(link => (
                    <li key={link.id}>
                      <Link 
                        to={link.url}
                        onClick={() => {
                          const container = containerRef.current;
                          if (container) {
                            container.scrollTop = 0;
                          }
                          window.scrollTo(0, 0);
                        }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="store-footer-bottom">
            <span>{branding.copyrightText}</span>
            <span>
              {(branding.paymentMethodsText || '').split('•').map((method, i) => (
                <span key={i} className="footer-payment-badge">{method.trim()}</span>
              ))}
            </span>
          </div>
        </footer>
      </div>

      {/* ---- Cart Sidebar ---- */}
      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-sidebar">
            <div className="cart-header">
              <h3>Shopping Cart ({cartCount})</h3>
              <button className="store-header-btn" onClick={() => setCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sf-text-tertiary)' }}>
                  <ShoppingCart size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)' }}>Your cart is empty</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Add items to start shopping</p>
                </div>
              ) : (
                cart.map((item) => {
                  const size = item.product.selectedSize || 'Free Size';
                  return (
                    <div key={`${item.product.id}-${size}`} className="cart-item">
                      <OptimizedImage src={item.product.image} alt={item.product.name} className="cart-item-image" width={100} height={100} />
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.product.name}</div>
                        {size !== 'Free Size' && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--sf-text-secondary)', marginTop: '2px' }}>
                            সাইজ (Size): <strong>{size}</strong>
                          </div>
                        )}
                        <div className="cart-item-price">৳{(item.product.price * item.quantity).toFixed(2)}</div>
                        <div className="cart-item-qty">
                          <button onClick={() => updateQuantity(item.product.id, size, -1)}><Minus size={14} /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, size, 1)}><Plus size={14} /></button>
                          <button
                            onClick={() => removeFromCart(item.product.id, size)}
                            style={{ marginLeft: 'auto', color: 'var(--sf-danger)', border: 'none' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="cart-footer">


                <div className="cart-total">
                  <span>Subtotal</span>
                  <span>৳{cartTotal.toFixed(2)}</span>
                </div>
                <Link 
                  to="/checkout" 
                  className="cart-checkout-btn" 
                  onClick={() => setCartOpen(false)} 
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Proceed to Checkout <ArrowRight size={18} />
                </Link>
                <div className="cart-trust-badges">
                  <span><Shield size={13} /> Secure</span>
                  <span><Truck size={13} /> Fast Delivery</span>
                  <span><RotateCcw size={13} /> Easy Return</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---- Wishlist Sidebar ---- */}
      {wishlistOpen && (
        <>
          <div className="wishlist-overlay" onClick={() => setWishlistOpen(false)} />
          <div className="wishlist-sidebar">
            <div className="wishlist-header">
              <h3>My Wishlist ({wishlist.length})</h3>
              <button className="store-header-btn" onClick={() => setWishlistOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="wishlist-items">
              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sf-text-tertiary)' }}>
                  <Heart size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)' }}>Your wishlist is empty</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Add items you love to your wishlist</p>
                </div>
              ) : (
                config.products
                  .filter(product => wishlist.some(id => String(id) === String(product.id)))
                  .map((product) => (
                    <div key={product.id} className="wishlist-item">
                      <OptimizedImage src={product.image} alt={product.name} className="wishlist-item-image" width={100} height={100} />
                      <div className="wishlist-item-info">
                        <Link 
                          to={`/product/${product.id}`} 
                          className="wishlist-item-name"
                          onClick={() => setWishlistOpen(false)}
                        >
                          {product.name}
                        </Link>
                        <div className="wishlist-item-price">৳{product.price.toFixed(2)}</div>
                        <div className="wishlist-item-actions">
                          <button 
                            className="wishlist-add-cart-btn"
                            onClick={() => {
                              addToCart(product);
                              setWishlist(prev => prev.filter(id => String(id) !== String(product.id)));
                            }}
                          >
                            Add to Cart
                          </button>
                          <button 
                            className="wishlist-remove-btn"
                            onClick={() => toggleWishlist(product.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}
      {/* ---- Mobile Navigation Menu Drawer ---- */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu-drawer">
            <div className="mobile-menu-header">
              <div className="store-logo" style={{ padding: '0 8px' }}>
                <CustomLogo />
              </div>
              <button className="store-header-btn" onClick={() => setMobileMenuOpen(false)} title="Close Menu">
                <X size={24} />
              </button>
            </div>
            
            <nav className="mobile-menu-nav">
              {navLinks.map(link => {
                const isShop = 
                  (link.label || '').toLowerCase().includes('shop') || 
                  (link.label || '').toLowerCase().includes('shоp') || 
                  (link.url || '').toLowerCase().endsWith('fitness-item') ||
                  link.id === 3;
                if (isShop) {
                  return (
                    <div key={link.id} className="mobile-menu-shop-wrapper" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Link 
                          to={link.url} 
                          className="mobile-menu-nav-link"
                          onClick={() => setMobileMenuOpen(false)}
                          style={{ flex: 1 }}
                        >
                          {link.label}
                        </Link>
                        <button 
                          className="mobile-menu-dropdown-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            setMobileShopDropdownOpen(!mobileShopDropdownOpen);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '12px 16px',
                            color: 'var(--sf-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'transform 0.2s ease',
                            transform: mobileShopDropdownOpen ? 'rotate(180deg)' : 'none'
                          }}
                          title="View Categories"
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                      {mobileShopDropdownOpen && (
                        <div 
                          className="mobile-menu-dropdown-list"
                          style={{
                            paddingLeft: '24px',
                            borderLeft: '2px solid rgba(226, 232, 240, 0.4)',
                            marginTop: '4px',
                            marginBottom: '8px'
                          }}
                        >
                          {categories.map(cat => {
                            const categorySlug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                            return (
                              <Link
                                key={cat.id}
                                to={`/collection/${categorySlug}`}
                                className="mobile-menu-dropdown-item"
                                onClick={() => {
                                  setMobileShopDropdownOpen(false);
                                  setMobileMenuOpen(false);
                                }}
                              >
                                {cat.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Link 
                    key={link.id} 
                    to={link.url} 
                    className="mobile-menu-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link 
                to="/events" 
                className="mobile-menu-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Events
              </Link>

              <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', marginTop: '16px', paddingTop: '16px' }}>
                <Link 
                  to="/account" 
                  className="mobile-menu-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <User size={18} />
                  <span>{customer ? 'My Profile' : 'Login / Register'}</span>
                </Link>
              </div>
            </nav>

            <div className="mobile-menu-footer">
              <div className="mobile-menu-contact-title">Contact Us</div>
              {config.contactInfo.phoneNumber && (
                <a href={`tel:${config.contactInfo.phoneNumber}`} className="mobile-menu-contact-item">
                  📞 {config.contactInfo.phoneNumber}
                </a>
              )}
              {config.contactInfo.email && (
                <a href={`mailto:${config.contactInfo.email}`} className="mobile-menu-contact-item">
                  ✉️ {config.contactInfo.email}
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav Removed */}

      {/* ---- WhatsApp Floating Chat Button & Lucky Spin Wheel ---- */}
      {config.contactInfo.whatsappNumber && (
        <a 
          href={`https://wa.me/${config.contactInfo.whatsappNumber}`}
          className="whatsapp-floating-btn"
          target="_blank"
          rel="noopener noreferrer"
          title="Chat with us on WhatsApp"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.638 1.982 14.19.953 11.62.953c-5.439 0-9.859 4.374-9.863 9.8.002 2.142.593 4.224 1.702 6.04L2.469 20.95l4.178-1.796zm12.355-6.862c-.302-.15-1.787-.872-2.064-.972-.278-.1-.481-.15-.681.15-.2.3-.775.972-.95 1.173-.175.2-.35.225-.651.075-.302-.15-1.272-.465-2.422-1.478-.895-.791-1.5-1.768-1.676-2.067-.175-.3-.019-.462.13-.611.135-.133.302-.35.452-.524.15-.175.2-.3.301-.5.1-.2.05-.375-.025-.525-.075-.15-.681-1.624-.932-2.225-.245-.583-.496-.503-.681-.512-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.012-1.05 2.472 0 1.46 1.075 2.872 1.225 3.072.15.2 2.116 3.197 5.126 4.475 2.137.907 2.923.904 3.969.754.761-.109 1.786-.723 2.037-1.423.25-.7.25-1.3.175-1.423-.075-.125-.275-.2-.575-.35z"/>
          </svg>
        </a>
      )}

    </div>
  );
}
