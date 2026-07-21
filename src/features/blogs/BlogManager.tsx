import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit, X, Search, FileText, CheckCircle, AlertCircle, Calendar, User } from 'lucide-react';
import { 
  fetchBlogsFromBackend, 
  createBlogInBackend, 
  updateBlogInBackend, 
  deleteBlogFromBackend 
} from '../../services/api';

export default function BlogManager() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [authorName, setAuthorName] = useState('Admin');
  const [published, setPublished] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const data = await fetchBlogsFromBackend();
      setBlogs(data);
    } catch (err) {
      console.error('Failed to load blogs on admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // Generate slug dynamically from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove special characters
      .replace(/[\s_]+/g, '-')  // replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost) {
      setSlug(generateSlug(val));
    }
  };

  const handleOpenCreate = () => {
    setEditingPost(null);
    setTitle('');
    setSlug('');
    setSummary('');
    setContent('');
    setBannerImage('');
    setAuthorName('Admin');
    setPublished(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (post: any) => {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setSummary(post.summary);
    setContent(post.content);
    setBannerImage(post.banner_image);
    setAuthorName(post.author_name);
    setPublished(post.published);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !content) {
      setErrorMsg('Title, slug, and content are required.');
      return;
    }

    const payload = {
      title,
      slug,
      summary,
      content,
      banner_image: bannerImage,
      author_name: authorName,
      published
    };

    try {
      let result;
      if (editingPost) {
        result = await updateBlogInBackend(editingPost.id, payload);
      } else {
        result = await createBlogInBackend(payload);
      }

      if (result && result.status === 'success') {
        setShowModal(false);
        loadBlogs();
      } else {
        setErrorMsg(result?.message || 'Failed to save blog post.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to connect to server.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      const result = await deleteBlogFromBackend(id);
      if (result && result.status === 'success') {
        loadBlogs();
      } else {
        alert(result?.message || 'Failed to delete blog post.');
      }
    } catch (err) {
      alert('Network error. Failed to delete blog post.');
    }
  };

  // Filter posts by search query
  const filteredBlogs = blogs.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPosts = blogs.length;
  const publishedPosts = blogs.filter(b => b.published).length;
  const draftPosts = totalPosts - publishedPosts;

  return (
    <div className="features-container">
      {/* Title Header */}
      <div className="header-row">
        <div>
          <h1 className="page-title">Blog Articles Manager</h1>
          <p className="page-subtitle">Publish sports guides, workout tutorials, and fitness tips.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> New Article
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper color-primary">
            <BookOpen size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Articles</span>
            <span className="stat-value">{totalPosts}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper color-success">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Published Articles</span>
            <span className="stat-value">{publishedPosts}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper color-warning">
            <FileText size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Draft Articles</span>
            <span className="stat-value">{draftPosts}</span>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="control-bar" style={{ display: 'flex', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-primary)' }}>
        <div className="search-input-wrapper" style={{ position: 'relative', flexGrow: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading blogs...</div>
      ) : filteredBlogs.length === 0 ? (
        <div style={{ padding: '45px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
          No articles found matching search criteria.
        </div>
      ) : (
        <div className="table-responsive" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)' }}>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Article Details</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Slug</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Author</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Date Created</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Status</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBlogs.map((post) => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border-primary)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {post.banner_image && (
                        <img src={post.banner_image} alt="" style={{ width: '56px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.94rem' }}>{post.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.summary}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}><code>{post.slug}</code></td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>{post.author_name}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <Calendar size={12} /> {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${post.published ? 'badge-success' : 'badge-warning'}`}>
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button className="btn-icon" onClick={() => handleOpenEdit(post)} title="Edit Article" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'none', cursor: 'pointer' }}>
                        <Edit size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(post.id)} title="Delete Article" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(5, 8, 16, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '16px', width: '90%', maxWidth: '700px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '10px' }}>
              {editingPost ? 'Edit Blog Article' : 'Write New Blog Article'}
            </h3>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Title *</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Skin Care tips"
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Slug *</label>
                  <input 
                    type="text" 
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="e.g. skin-care-tips"
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Summary / Excerpt (Short details)</label>
                <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Short introduction to show on the list page..."
                  rows={2}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Content (HTML formatted) *</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="<p>Write your detailed article body in HTML format...</p>"
                  rows={8}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'monospace', resize: 'vertical' }}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>Tip: Use standard HTML tags like <code>&lt;p&gt;</code>, <code>&lt;h3&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;li&gt;</code> for heading structures.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Banner Image URL</label>
                  <input 
                    type="text" 
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Author Name</label>
                  <input 
                    type="text" 
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Sabiha Islam"
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <input 
                  type="checkbox" 
                  id="published" 
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="published" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Publish immediately (make visible on storefront blogs list)</label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid var(--border-primary)', paddingTop: '15px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPost ? 'Save Changes' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
