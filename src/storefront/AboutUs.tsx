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
          <p className="premium-page-subtitle">জানুন আমাদের লক্ষ্য, মূল্যবোধ এবং পথচলার গল্প</p>
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
              <h3 className="about-card-title">আমাদের লক্ষ্য (Mission)</h3>
              <p className="about-card-text">
                সুলভ মূল্যে এবং বিশ্বস্ততার সাথে সেরা ফিটনেস ও জিম একুপমেন্ট এবং সামগ্রী প্রতিটি ঘরে পৌঁছে দেওয়া, যাতে মানুষ আরও সুস্থ ও সক্রিয় জীবনযাপন করতে পারে।
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon">
                <ShieldCheck size={24} />
              </div>
              <h3 className="about-card-title">কোয়ালিটি গ্যারান্টি</h3>
              <p className="about-card-text">
                আমরা আমাদের প্রতিটি পণ্যের গুণগত মান কঠোরভাবে যাচাই করি। গ্রাহকদের ১০০% আসল এবং টেকসই স্পোর্টস পণ্য সরবরাহ করাই আমাদের অগ্রাধিকার।
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon">
                <HeartHandshake size={24} />
              </div>
              <h3 className="about-card-title">গ্রাহক সেবা (Support)</h3>
              <p className="about-card-text">
                অর্ডার নিশ্চিতকরণ থেকে শুরু করে হোম ডেলিভারি এবং পরবর্তী যেকোনো প্রয়োজনে আমাদের কাস্টমার সাপোর্ট টিম সর্বদা আন্তরিক সেবা দিতে প্রস্তুত।
              </p>
            </div>
          </div>

          {/* Stats Counter Bar */}
          <div className="about-stats-section">
            <div className="about-stat-item">
              <div className="about-stat-number" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Award size={24} /> ৫+
              </div>
              <div className="about-stat-label">বছরের অভিজ্ঞতা</div>
            </div>
            <div className="about-stat-item">
              <div className="about-stat-number">৫০,০০০+</div>
              <div className="about-stat-label">সফল ডেলিভারি</div>
            </div>
            <div className="about-stat-item">
              <div className="about-stat-number">৪.৯ ★</div>
              <div className="about-stat-label">গ্রাহক সন্তুষ্টি রেটিং</div>
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
