import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Target, ShieldCheck, HeartHandshake, Award } from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { replaceContactInfo, formatPageContent } from '../utils/storefrontUtils';

export default function AboutUs() {
  const [config] = useStorefrontConfig();

  useEffect(() => {
    const container = document.querySelector('.storefront-scroll-container');
    if (container) {
      container.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, []);

  // Find the about us link from all footer columns or navLinks
  const allLinks = [
    ...config.navLinks,
    ...config.footerColumns.flatMap(col => col.links),
  ];
  
  // Find link by label or ID 11
  const aboutLink = allLinks.find(
    link => {
      const labelLower = (link.label || '').toLowerCase();
      return labelLower === 'about us' || labelLower === 'about' || link.id === 11;
    }
  );

  const rawContent = aboutLink?.customPageContent || '';
  const formattedHtml = formatPageContent(replaceContactInfo(rawContent, config.contactInfo));

  return (
    <div className="premium-about-page" style={{ paddingBottom: '80px' }}>
      {/* Hero Banner */}
      <div className="premium-page-hero">
        <div className="premium-page-hero-content">
          <span className="premium-page-badge">Our Story</span>
          <h1 className="premium-page-hero-title">About {config.branding.storeName}</h1>
          <p className="premium-page-subtitle">Learn about our mission, values, and journey</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="premium-page-container" style={{ gridTemplateColumns: '1fr', marginTop: '32px', maxWidth: '1000px' }}>
        
        {/* Rich Content Card */}
        <div className="premium-content-card">
          <nav className="collection-breadcrumb" style={{ marginBottom: '24px', padding: 0 }}>
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <span>About Us</span>
          </nav>

          {formattedHtml ? (
            <div 
              className="premium-rich-content"
              dangerouslySetInnerHTML={{ __html: formattedHtml }} 
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--sf-text-tertiary)', padding: '24px 0' }}>
              <p>No About Us content configured yet.</p>
            </div>
          )}

          {/* Mission, Vision & Core values grid */}
          <div className="about-mission-section">
            <div className="about-card">
              <div className="about-card-icon">
                <Target size={24} />
              </div>
              <h3 className="about-card-title">Our Mission</h3>
              <p className="about-card-text">
                To deliver the best fitness and gym equipment to every household at affordable prices with reliability, helping people live a healthier and active life.
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon">
                <ShieldCheck size={24} />
              </div>
              <h3 className="about-card-title">Quality Guarantee</h3>
              <p className="about-card-text">
                We rigorously verify the quality of each of our products. Our priority is to supply customers with 100% authentic and durable sports products.
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon">
                <HeartHandshake size={24} />
              </div>
              <h3 className="about-card-title">Customer Service (Support)</h3>
              <p className="about-card-text">
                From order confirmation to home delivery and any subsequent needs, our customer support team is always ready to provide sincere service.
              </p>
            </div>
          </div>

          {/* Stats Counter Bar */}
          <div className="about-stats-section">
            <div className="about-stat-item">
              <div className="about-stat-number" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Award size={24} /> 5+
              </div>
              <div className="about-stat-label">Years of Experience</div>
            </div>
            <div className="about-stat-item">
              <div className="about-stat-number">50,000+</div>
              <div className="about-stat-label">Successful Deliveries</div>
            </div>
            <div className="about-stat-item">
              <div className="about-stat-number">4.9 ★</div>
              <div className="about-stat-label">Customer Satisfaction Rating</div>
            </div>
          </div>
        </div>

        <div className="custom-page-back-button">
          <Link to="/" className="store-btn store-btn-outline">
            <ArrowLeft size={16} /> Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}

