import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Clock } from 'lucide-react';
import { fetchBlogBySlugFromBackend } from '../services/api';
import { OptimizedImage } from '../components/layout/OptimizedImage';
import { SEOMeta } from '../components/layout/SEOMeta';

export default function BlogDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getBlog = async () => {
      if (!slug) return;
      try {
        const data = await fetchBlogBySlugFromBackend(slug);
        setBlog(data);
      } catch (err) {
        console.error('Failed to load blog post:', err);
      } finally {
        setLoading(false);
      }
    };
    getBlog();
  }, [slug]);

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Estimate reading time based on character count
  const getReadTime = (content: string) => {
    if (!content) return 2;
    const words = content.replace(/<[^>]*>/g, '').length;
    return Math.max(1, Math.ceil(words / 400)); // Average reading speed for Bengali/English
  };

  if (loading) {
    return (
      <div className="pdp-container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div className="skeleton-card" style={{ height: '40px', width: '60%', marginBottom: '20px' }} />
        <div className="skeleton-card" style={{ height: '350px', width: '100%', marginBottom: '20px', borderRadius: '16px' }} />
        <div className="skeleton-card" style={{ height: '20px', width: '100%', marginBottom: '10px' }} />
        <div className="skeleton-card" style={{ height: '20px', width: '90%', marginBottom: '10px' }} />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="pdp-not-found" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>ব্লগ পোস্টটি পাওয়া যায়নি</h2>
        <p>দুঃখিত, আপনি যে লিংকটি খুঁজছেন তা বর্তমানে নিষ্ক্রিয় বা মুছে ফেলা হয়েছে।</p>
        <Link to="/blogs" className="store-btn store-btn-primary" style={{ marginTop: '20px' }}>
          ব্লগে ফিরে যান
        </Link>
      </div>
    );
  }

  return (
    <article className="pdp-container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <SEOMeta 
        title={blog.title} 
        description={blog.summary || blog.title}
        image={blog.banner_image}
        slug={`blog/${blog.slug}`}
      />

      {/* Back button */}
      <Link 
        to="/blogs" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--sf-text-secondary)', 
          textDecoration: 'none', 
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '30px',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--sf-accent)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--sf-text-secondary)'}
      >
        <ArrowLeft size={16} /> সকল ব্লগে ফিরে যান
      </Link>

      {/* Article Title */}
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: 800, 
        color: 'var(--sf-text-primary)', 
        lineHeight: '1.3', 
        marginBottom: '20px',
        letterSpacing: '-0.02em'
      }}>
        {blog.title}
      </h1>

      {/* Metadata */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '24px', 
        fontSize: '0.88rem', 
        color: 'var(--sf-text-secondary)', 
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-secondary)',
        marginBottom: '30px'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <User size={16} style={{ color: 'var(--sf-accent)' }} /> <strong>লেখক:</strong> {blog.author_name}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={16} style={{ color: 'var(--sf-accent)' }} /> <strong>প্রকাশকাল:</strong> {formatDate(blog.created_at)}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} style={{ color: 'var(--sf-accent)' }} /> <strong>পড়তে সময় লাগবে:</strong> {getReadTime(blog.content)} মিনিট
        </span>
      </div>

      {/* Banner Image */}
      {blog.banner_image && (
        <div style={{ 
          width: '100%', 
          height: '420px', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          marginBottom: '40px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
        }}>
          <OptimizedImage 
            src={blog.banner_image} 
            alt={blog.title} 
            width={800} 
            height={500} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Rich Text Content */}
      <div 
        className="blog-content-body"
        style={{
          fontSize: '1.12rem',
          lineHeight: '1.8',
          color: 'var(--sf-text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />
      
      {/* Styles for Blog Content injected locally */}
      <style>{`
        .blog-content-body h3 {
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--sf-text-primary);
          margin-top: 30px;
          margin-bottom: 10px;
        }
        .blog-content-body p {
          margin-bottom: 15px;
        }
        .blog-content-body ul, .blog-content-body ol {
          padding-left: 24px;
          margin-bottom: 15px;
        }
        .blog-content-body li {
          margin-bottom: 8px;
        }
        .blog-content-body strong {
          color: var(--sf-text-primary);
        }
      `}</style>
    </article>
  );
}
