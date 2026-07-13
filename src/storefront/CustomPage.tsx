import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { replaceContactInfo, formatPageContent } from '../utils/storefrontUtils';

export default function CustomPage() {
  const { id } = useParams<{ id: string }>();
  const [config] = useStorefrontConfig();

  // Find the matching link from all footer columns or navLinks
  const allLinks = [
    ...config.navLinks,
    ...config.footerColumns.flatMap(col => col.links),
  ];
  const activeLink = allLinks.find(link => link.id === Number(id));

  if (!activeLink || !activeLink.customPageContent) {
    return (
      <div className="collection-page">
        <div className="collection-empty">
          <h2>Page not found</h2>
          <p>The page you are looking for does not exist or has no content configured yet.</p>
          <Link to="/" className="store-btn store-btn-primary">
            <ArrowLeft size={16} /> Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-page custom-page">
      {/* Breadcrumb */}
      <nav className="collection-breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} />
        <span>{activeLink.label}</span>
      </nav>

      {/* Main Content Area */}
      <div className="custom-page-wrapper">
        <div className="custom-page-header">
          <h1 className="custom-page-title">{activeLink.label}</h1>
        </div>
        
        <div className="custom-page-content-card">
          <div 
            className="custom-page-rich-content"
            dangerouslySetInnerHTML={{ __html: formatPageContent(replaceContactInfo(activeLink.customPageContent, config.contactInfo)) }} 
          />
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
