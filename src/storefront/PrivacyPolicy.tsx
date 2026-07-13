import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { replaceContactInfo, formatPageContent } from '../utils/storefrontUtils';

interface HeadingItem {
  id: string;
  text: string;
}

export default function PrivacyPolicy() {
  const [config] = useStorefrontConfig();
  const [activeSection, setActiveSection] = useState<string>('');

  // Find the privacy policy link from all footer columns or navLinks
  const allLinks = [
    ...config.navLinks,
    ...config.footerColumns.flatMap(col => col.links),
  ];
  
  const privacyLink = allLinks.find(
    link => (link.label || '').toLowerCase() === 'privacy policy' || link.id === 13
  );

  const rawContent = privacyLink?.customPageContent || '';
  
  // Format the contact info and newlines first
  const baseHtml = formatPageContent(replaceContactInfo(rawContent, config.contactInfo));

  // Extract headings from the formatted HTML to build dynamic Table of Contents
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [processedHtml, setProcessedHtml] = useState<string>('');

  useEffect(() => {
    if (!baseHtml) return;

    // Use regular expression to find all <h3> text inside the HTML
    const matches = Array.from(baseHtml.matchAll(/<h3>(.*?)<\/h3>/g));
    const items: HeadingItem[] = [];
    let updatedHtml = baseHtml;

    matches.forEach((match, index) => {
      const headingText = match[1].replace(/<[^>]*>/g, ''); // Strip inline HTML
      const sectionId = `section-${index}`;
      items.push({
        id: sectionId,
        text: headingText,
      });

      // Inject the id attribute into the <h3> tag so we can link to it
      updatedHtml = updatedHtml.replace(
        match[0],
        `<h3 id="${sectionId}">${match[1]}</h3>`
      );
    });

    setHeadings(items);
    setProcessedHtml(updatedHtml);

    if (items.length > 0) {
      setActiveSection(items[0].id);
    }
  }, [baseHtml]);

  // Scroll to top on mount
  useEffect(() => {
    const container = document.querySelector('.storefront-scroll-container');
    if (container) {
      container.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, []);

  // Set up scroll listener to highlight active section in TOC
  useEffect(() => {
    if (headings.length === 0) return;

    const container = document.querySelector('.storefront-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + 180; // Offset for threshold
      
      // Find current section
      let currentSection = headings[0].id;
      for (const heading of headings) {
        const el = document.getElementById(heading.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offsetTop = rect.top - containerRect.top + container.scrollTop;
          if (offsetTop <= scrollPosition) {
            currentSection = heading.id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const container = document.querySelector('.storefront-scroll-container');
    if (el && container) {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offsetTop = rect.top - containerRect.top + container.scrollTop - 40; // offset

      container.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="premium-policy-page" style={{ paddingBottom: '80px' }}>
      {/* Hero Banner */}
      <div className="premium-page-hero">
        <div className="premium-page-hero-content">
          <span className="premium-page-badge">Privacy & Safety</span>
          <h1 className="premium-page-hero-title">Privacy Policy</h1>
          <p className="premium-page-subtitle">আমাদের ডাটা প্রসেসিং পলিসি ও আপনার কাস্টমার ডাটা সিকিউরিটি সম্পর্কে বিস্তারিত জানুন</p>
        </div>
      </div>

      {/* Two-Column Grid Layout */}
      <div className="premium-page-container">
        
        {/* Sticky Table of Contents (Sidebar) */}
        <aside className="premium-page-sidebar">
          {headings.length > 0 && (
            <div className="premium-toc-card">
              <h2 className="premium-toc-title">সূচিপত্র (Contents)</h2>
              <ul className="premium-toc-list">
                {headings.map((item) => (
                  <li 
                    key={item.id}
                    className={`premium-toc-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="premium-content-card">
          <nav className="collection-breadcrumb" style={{ marginBottom: '24px', padding: 0 }}>
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <span>Privacy Policy</span>
          </nav>

          {processedHtml ? (
            <div 
              className="premium-rich-content"
              dangerouslySetInnerHTML={{ __html: processedHtml }} 
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--sf-text-tertiary)', padding: '24px 0' }}>
              <p>No Privacy Policy content configured yet.</p>
            </div>
          )}
        </main>
      </div>

      {/* Back Button */}
      <div className="custom-page-back-button" style={{ marginTop: '0' }}>
        <Link to="/" className="store-btn store-btn-outline">
          <ArrowLeft size={16} /> Back to Store
        </Link>
      </div>
    </div>
  );
}
