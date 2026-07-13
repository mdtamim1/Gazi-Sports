import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Clock, ArrowRight } from 'lucide-react';
import { fetchBlogsFromBackend } from '../services/api';
import { OptimizedImage } from '../components/layout/OptimizedImage';
import { SEOMeta } from '../components/layout/SEOMeta';

export default function BlogList() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getBlogs = async () => {
      try {
        const data = await fetchBlogsFromBackend();
        setBlogs(data.filter(b => b.published));
      } catch (err) {
        console.error('Failed to load blogs on storefront:', err);
      } finally {
        setLoading(false);
      }
    };
    getBlogs();
  }, []);

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="pdp-container" style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      <SEOMeta 
        title="Beauty & Lifestyle Blogs" 
        description="ত্বকের যত্ন, রূপচর্চা এবং মেকআপ টিপস নিয়ে আমাদের প্রফেশনাল বিউটি ব্লগ ও লাইফস্টাইল আর্টিকেলসমূহ পড়ুন।"
        slug="blogs"
      />

      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <span style={{ 
          background: 'rgba(99, 102, 241, 0.1)', 
          color: 'var(--sf-accent)', 
          padding: '6px 14px', 
          borderRadius: '20px', 
          fontSize: '0.85rem', 
          fontWeight: 700, 
          letterSpacing: '0.05em' 
        }}>
          BEAUTY & LIFESTYLE BLOG
        </span>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          color: 'var(--sf-text-primary)', 
          marginTop: '15px',
          letterSpacing: '-0.02em'
        }}>
          আমাদের সৌন্দর্য ও যত্ন বিষয়ক ব্লগপোস্ট
        </h1>
        <p style={{ 
          color: 'var(--sf-text-secondary)', 
          maxWidth: '600px', 
          margin: '15px auto 0', 
          fontSize: '1rem',
          lineHeight: '1.6'
        }}>
          নিজেকে আরও আকর্ষণীয় ও সতেজ রাখতে ত্বক, মেকআপ এবং জীবনযাত্রার সহজ টিপস ও প্রফেশনাল গাইডলাইন পড়ুন।
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card" style={{ height: '400px', background: 'var(--sf-bg-light, #f6f6f6)', borderRadius: '16px' }} />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--sf-bg-light, #f6f6f6)', borderRadius: '16px' }}>
          <h3 style={{ color: 'var(--sf-text-secondary)' }}>কোনো ব্লগপোস্ট খুঁজে পাওয়া যায়নি।</h3>
          <Link to="/" className="store-btn store-btn-primary" style={{ marginTop: '20px' }}>স্টোরে ফিরে যান</Link>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '30px',
          marginBottom: '60px'
        }}>
          {blogs.map((blog) => (
            <article 
              key={blog.id} 
              className="product-card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                background: 'var(--sf-bg-white, #ffffff)',
                borderRadius: 'var(--sf-radius-xl, 12px)',
                overflow: 'hidden',
                border: '1px solid var(--sf-border, #e5e5e5)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                height: '100%'
              }}
            >
              <Link to={`/blog/${blog.slug}`} style={{ height: '220px', width: '100%', display: 'block', overflow: 'hidden' }}>
                <OptimizedImage 
                  src={blog.banner_image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80'} 
                  alt={blog.title} 
                  width={600} 
                  height={400} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Link>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                {/* Meta details */}
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '0.8rem', 
                  color: 'var(--sf-text-tertiary)', 
                  marginBottom: '12px' 
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {formatDate(blog.created_at)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> {blog.author_name}
                  </span>
                </div>

                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 700, 
                  color: 'var(--sf-text-primary)', 
                  lineHeight: '1.4', 
                  marginBottom: '12px',
                  height: '2.8em',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  <Link to={`/blog/${blog.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {blog.title}
                  </Link>
                </h2>

                <p style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--sf-text-secondary)', 
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  height: '4.8em',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {blog.summary}
                </p>

                <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--border-secondary)' }}>
                  <Link 
                    to={`/blog/${blog.slug}`} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      color: 'var(--sf-accent)', 
                      textDecoration: 'none', 
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}
                  >
                    বিস্তারিত পড়ুন <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
