import { useState, useMemo } from 'react';
import { Package, Search, Plus, Download, Edit, Trash2, AlertCircle, Grid, List as ListIcon, Star, X, RefreshCw, CheckCircle, Upload } from 'lucide-react';
import { useStorefrontConfig, type ProductConfig } from '../../store/storefrontConfig';
import { convertToWebP } from '../../utils/imageCdn';
import { formatCurrency } from '../../mock/data';
import { createProductInBackend, updateProductInBackend, deleteProductFromBackend, fetchProductsFromBackend } from '../../services/api';
import '../storefront-manager/storefront-manager.css';

export default function Products() {
  const [config, setConfig] = useStorefrontConfig();
  const products = config.products;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  
  // Modals state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [tempProduct, setTempProduct] = useState<ProductConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editorTab, setEditorTab] = useState<'basic' | 'inventory' | 'media' | 'features'>('basic');
  const [customOptionInput, setCustomOptionInput] = useState('');
  const [sizesInput, setSizesInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [weightsInput, setWeightsInput] = useState('');
  const [heightsInput, setHeightsInput] = useState('');
  const [customInput, setCustomInput] = useState('');

  const perPage = viewMode === 'list' ? 12 : 8;

  const categoryNames = useMemo(() => {
    return config.categories.map(c => c.name);
  }, [config.categories]);

  // Reorder single stock item (+20 units)
  const handleReorder = async (prodId: string | number) => {
    const found = products.find(p => String(p.id) === String(prodId));
    if (!found) return;
    const newStock = (found.stock ?? 0) + 20;

    const list = products.map(p => {
      if (String(p.id) === String(prodId)) {
        return { ...p, stock: newStock, inStock: true };
      }
      return p;
    });
    setConfig({ ...config, products: list });
    alert(`Stock reordered for ${found.name}! +20 units added.`);

    await updateProductInBackend(prodId, { ...found, stock: newStock });
    const fresh = await fetchProductsFromBackend();
    if (fresh) {
      setConfig({ ...config, products: fresh });
    }
  };

  // Set single product stock to 0 and out of stock
  const handleSetOutOfStock = async (prodId: string | number) => {
    const found = products.find(p => String(p.id) === String(prodId));
    if (!found) return;

    const list = products.map(p => {
      if (String(p.id) === String(prodId)) {
        return { ...p, stock: 0, inStock: false };
      }
      return p;
    });
    setConfig({ ...config, products: list });
    alert(`Product "${found.name}" is now set Out of Stock!`);

    await updateProductInBackend(prodId, { ...found, stock: 0, inStock: false });
    const fresh = await fetchProductsFromBackend();
    if (fresh) {
      setConfig({ ...config, products: fresh });
    }
  };

  // Delete Product
  const handleDeleteProduct = async (prod: ProductConfig) => {
    if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
      // Optimistically remove from local state immediately (before API call)
      const listWithoutDeleted = products.filter(p => String(p.id) !== String(prod.id));
      setConfig(prev => ({ ...prev, products: listWithoutDeleted }));

      const result = await deleteProductFromBackend(prod.id);
      if (result.success) {
        // Refetch from backend to sync any server-side state
        const fresh = await fetchProductsFromBackend();
        if (fresh) {
          // Only update if backend confirms product is truly gone
          const freshWithoutDeleted = fresh.filter(p => String(p.id) !== String(prod.id));
          setConfig(prev => ({ ...prev, products: freshWithoutDeleted }));
        }
        // If refetch fails, keep the optimistic removal from above
      } else {
        // Backend delete failed — restore the product back
        setConfig(prev => ({ ...prev, products: products }));
        alert(`Failed to delete product: ${result.message || 'Unknown error'}`);
      }
    }
  };


  // Simulated Bulk Upload
  const handleBulkUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const numericIds = products.map(p => Number(p.id)).filter(n => !isNaN(n));
    const startId = numericIds.length > 0 ? Math.max(0, ...numericIds) : 0;
    const bulkItems: ProductConfig[] = [
      {
        id: startId + 1,
        name: 'Bulk Product A',
        sku: 'BLK-A-' + Date.now(),
        category: categoryNames[0] || 'Electronics',
        brand: 'BulkBrand',
        price: 120,
        originalPrice: 150,
        rating: 4.0,
        reviews: 12,
        image: 'https://picsum.photos/seed/bulk-a/600/600',
        gallery: [],
        badge: 'sale',
        inStock: true,
        published: true,
        description: 'Bulk product A description',
        features: [],
        specs: [],
        customerReviews: [],
        relatedProducts: [],
        stock: 15,
        sold: 0,
        revenue: 0,
      },
      {
        id: startId + 2,
        name: 'Bulk Product B',
        sku: 'BLK-B-' + Date.now(),
        category: categoryNames[0] || 'Electronics',
        brand: 'BulkBrand',
        price: 85,
        originalPrice: null,
        rating: 4.2,
        reviews: 8,
        image: 'https://picsum.photos/seed/bulk-b/600/600',
        gallery: [],
        badge: null,
        inStock: true,
        published: true,
        description: 'Bulk product B description',
        features: [],
        specs: [],
        customerReviews: [],
        relatedProducts: [],
        stock: 25,
        sold: 0,
        revenue: 0,
      }
    ];
    setConfig({ ...config, products: [...products, ...bulkItems] });
    alert('Simulated bulk upload success: 2 products added!');
    setShowBulkModal(false);
  };

  // Open Edit Editor
  const openEditEditor = (prod: ProductConfig) => {
    const prodSizes = prod.sizes || [];
    
    // Group them
    const SIZES_KEYS = ['s', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl', '6xl', 'free size'];
    const COLORS_KEYS = ['red', 'blue', 'black', 'white', 'green', 'yellow', 'grey', 'orange', 'pink', 'purple', 'navy', 'maroon', 'brown', 'gold', 'silver', 'beige', 'cream', 'olive', 'রং', 'লাল', 'নীল', 'কালো', 'সাদা', 'সবুজ', 'হলুদ', 'ধূসর', 'কমলা', 'গোলাপী'];

    const sizesArr: string[] = [];
    const colorsArr: string[] = [];
    const weightsArr: string[] = [];
    const heightsArr: string[] = [];
    const customArr: string[] = [];

    prodSizes.forEach(s => {
      if (!s.enabled) return;
      const labelLower = s.label.toLowerCase().trim();
      if (SIZES_KEYS.includes(labelLower)) {
        sizesArr.push(s.label);
      } else if (COLORS_KEYS.includes(labelLower)) {
        colorsArr.push(s.label);
      } else if (labelLower.endsWith('kg') || labelLower.endsWith('gm') || labelLower.endsWith('g') || labelLower.endsWith('lbs') || labelLower.includes('kg') || labelLower.includes('gm')) {
        weightsArr.push(s.label);
      } else if (labelLower.endsWith('ft') || labelLower.endsWith('cm') || labelLower.endsWith('inch') || labelLower.endsWith('inches') || labelLower.includes('ft') || labelLower.includes('cm') || labelLower.includes('inch')) {
        heightsArr.push(s.label);
      } else {
        customArr.push(s.label);
      }
    });

    setSizesInput(sizesArr.join(', '));
    setColorsInput(colorsArr.join(', '));
    setWeightsInput(weightsArr.join(', '));
    setHeightsInput(heightsArr.join(', '));
    setCustomInput(customArr.join(', '));

    setTempProduct({
      ...prod,
      stock: prod.stock ?? 20,
      sold: prod.sold ?? 0,
      revenue: prod.revenue ?? 0,
    });
    setIsAdding(false);
    setEditorTab('basic');
  };

  const handleOptionsChange = (
    newSizes: string,
    newColors: string,
    newWeights: string,
    newHeights: string,
    newCustom: string
  ) => {
    if (!tempProduct) return;
    const prevSizesMap = new Map((tempProduct.sizes || []).map(s => [s.label, s]));
    const parseInput = (text: string) => text.split(',').map(s => s.trim()).filter(Boolean);
    
    const allLabels = [
      ...parseInput(newSizes),
      ...parseInput(newColors),
      ...parseInput(newWeights),
      ...parseInput(newHeights),
      ...parseInput(newCustom)
    ];
    
    const uniqueLabels = Array.from(new Set(allLabels));
    const finalSizes = uniqueLabels.map(label => {
      const prev = prevSizesMap.get(label);
      return {
        label,
        enabled: true,
        price: prev ? prev.price : undefined,
        originalPrice: prev ? (prev as any).originalPrice : undefined
      };
    });
    
    setTempProduct({ ...tempProduct, sizes: finalSizes });
  };

  const toggleSizeOption = (label: string) => {
    if (!tempProduct) return;
    const currentSizes = tempProduct.sizes || [];
    const exists = currentSizes.some(s => s.label === label);
    let newSizes;
    if (exists) {
      newSizes = currentSizes.map(s => s.label === label ? { ...s, enabled: !s.enabled } : s);
    } else {
      newSizes = [...currentSizes, { label, enabled: true }];
    }
    setTempProduct({ ...tempProduct, sizes: newSizes });

    // Sync sizesInput
    const enabledSizes = newSizes.filter(s => s.enabled);
    const SIZES_KEYS = ['s', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl', '6xl', 'free size'];
    const sizesArr = enabledSizes.filter(s => SIZES_KEYS.includes(s.label.toLowerCase().trim())).map(s => s.label);
    setSizesInput(sizesArr.join(', '));
  };

  // Open Add Editor
  const openAddEditor = () => {
    const numericIds = products.map(p => Number(p.id)).filter(n => !isNaN(n));
    const nextId = (numericIds.length > 0 ? Math.max(0, ...numericIds) : 0) + 1;
    setSizesInput('');
    setColorsInput('');
    setWeightsInput('');
    setHeightsInput('');
    setCustomInput('');

    setTempProduct({
      id: nextId,
      name: '',
      sku: 'SKU-' + Date.now().toString(36).toUpperCase(),
      category: categoryNames[0] || 'Fitness Item',
      brand: '',
      price: 0,
      originalPrice: null,
      rating: 4.5,
      reviews: 0,
      image: 'https://picsum.photos/seed/' + Date.now() + '/600/600',
      gallery: [],
      badge: null,
      inStock: true,
      published: true,
      description: '',
      features: [],
      specs: [],
      customerReviews: [],
      relatedProducts: [],
      videoUrl: '',
      photoContent: '',
      stock: 10,
      sold: 0,
      revenue: 0,
      sizes: [],
    });
    setIsAdding(true);
    setEditorTab('basic');
  };

  // Save Add/Edit Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProduct) return;

    if (!tempProduct.name || !tempProduct.name.trim()) {
      alert("Product Name is required! Please go to the 'Basic Info' tab and enter a name.");
      setEditorTab('basic');
      return;
    }

    const skuVal = tempProduct.sku && tempProduct.sku.trim()
      ? tempProduct.sku.trim()
      : 'SKU-' + Date.now().toString(36).toUpperCase();

    if (tempProduct.price === undefined || tempProduct.price === null || isNaN(tempProduct.price)) {
      alert("Product Price is required! Please go to the 'Basic Info' tab and enter a price.");
      setEditorTab('basic');
      return;
    }

    const slugVal = tempProduct.slug || tempProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const isActuallyInStock = (tempProduct.stock !== undefined && tempProduct.stock !== null) ? (tempProduct.stock > 0 ? tempProduct.inStock : false) : tempProduct.inStock;
    const productWithSlug = { ...tempProduct, sku: skuVal, slug: slugVal, inStock: isActuallyInStock };

    try {
      if (isAdding) {
        const res = await createProductInBackend(productWithSlug);
        if (res.status === 'error') {
          alert(`Failed to publish product: ${res.message || 'Unknown error'}`);
          return;
        }
        if (res.data && res.data.id) {
          productWithSlug.id = res.data.id;
        }
      } else {
        const success = await updateProductInBackend(productWithSlug.id, productWithSlug);
        if (!success) {
          alert("Failed to update product in backend.");
          return;
        }
      }

      const fresh = await fetchProductsFromBackend();
      if (fresh) {
        setConfig(prev => ({ ...prev, products: fresh }));
      } else {
        let updatedList: ProductConfig[];
        if (isAdding) {
          updatedList = [...products, productWithSlug];
        } else {
          updatedList = products.map(p => String(p.id) === String(productWithSlug.id) ? productWithSlug : p);
        }
        setConfig(prev => ({ ...prev, products: updatedList }));
      }
      setTempProduct(null);
    } catch (err: any) {
      console.error("Backend synchronisation error:", err);
      alert(`Error saving product: ${err.message || 'Network error'}`);
    }
  };

  // Sorting & Filtering memo
  const filtered = useMemo(() => {
    let result = [...products];

    // Filter
    if (search) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.sku.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'outofstock') {
        result = result.filter(p => p.inStock === false || (p.stock !== undefined && p.stock <= 0));
      } else {
        const isPublished = statusFilter === 'active';
        result = result.filter(p => p.published === isPublished);
      }
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'stock-low') return (a.stock ?? 20) - (b.stock ?? 20);
      if (sortBy === 'sold-high') return (b.sold ?? 0) - (a.sold ?? 0);
      return 0;
    });

    return result;
  }, [products, search, statusFilter, sortBy]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const lowStockCount = products.filter(p => (p.stock ?? 20) < 10).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Products</span></div>
          <h1 className="page-title">Product Control Center</h1>
          <p className="page-subtitle">Manage inventory, pricing, and product catalogs</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}><Download size={16} /> Bulk Upload</button>
          <button className="btn btn-primary" onClick={openAddEditor}><Plus size={16} /> Add Product</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Products', value: products.length.toString(), icon: Package, color: 'primary' },
          { label: 'Active Listings', value: products.filter(p => p.published).length.toString(), icon: CheckCircle, color: 'success' },
          { label: 'Low Stock Alerts', value: lowStockCount.toString(), icon: AlertCircle, color: 'warning' },
          { label: 'Out of Stock', value: products.filter(p => (p.stock ?? 20) === 0).length.toString(), icon: Trash2, color: 'danger' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stat-card-header">
                <div className={`stat-card-icon ${s.color}`}><Icon size={20} /></div>
              </div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="data-table-container">
        <div className="data-table-header">
          <div className="data-table-title">Product Inventory</div>
          <div className="data-table-actions">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ height: '34px', paddingLeft: '32px', width: '180px', fontSize: 'var(--text-xs)' }}
                placeholder="Search SKU, name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            {/* Status Filter */}
            <select className="form-select" style={{ height: '34px', width: '130px', fontSize: 'var(--text-xs)' }}
              value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="outofstock">Out of Stock</option>
            </select>
            {/* Sorter */}
            <select className="form-select" style={{ height: '34px', width: '120px', fontSize: 'var(--text-xs)' }}
              value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Sort by Name</option>
              <option value="price-high">Price: High-Low</option>
              <option value="price-low">Price: Low-High</option>
              <option value="stock-low">Stock: Low-High</option>
              <option value="sold-high">Top Sellers</option>
            </select>
            {/* Layout Switcher */}
            <div className="chart-tabs">
              <button className={`chart-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><ListIcon size={14} /></button>
              <button className={`chart-tab ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><Grid size={14} /></button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sales</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((product) => {
                const stock = product.stock ?? 20;
                const sold = product.sold ?? 0;
                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={product.image} alt={product.name} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--border-primary)' }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{product.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{product.sku}</td>
                    <td>{product.category}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(product.price)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stock > 10 ? 'var(--color-success)' : stock > 0 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                          <span style={{ color: stock < 10 ? 'var(--color-warning)' : 'inherit', fontWeight: stock < 10 ? 600 : 'normal' }}>{stock}</span>
                        </span>
                        {stock > 0 && product.inStock !== false ? (
                          <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', height: '22px', fontSize: '10px', color: 'var(--color-danger)' }} title="Set Out of Stock" onClick={() => handleSetOutOfStock(product.id)}>
                            Stock Out
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', height: '22px', fontSize: '10px', color: 'var(--color-success)' }} title="Quick Reorder 20 Items" onClick={() => handleReorder(product.id)}>
                            <RefreshCw size={10} /> Reorder (+20)
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{sold.toLocaleString()}</td>
                    <td><span className={`badge ${product.published ? 'badge-success' : 'badge-warning'}`}>{product.published ? 'Active' : 'Draft'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditEditor(product)}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteProduct(product)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="grid-4" style={{ padding: 'var(--space-5)' }}>
            {paginated.map((product) => {
              const stock = product.stock ?? 20;
              return (
                <div key={product.id} className="card" style={{ padding: '0' }}>
                  <img src={product.image} alt={product.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  <div style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', lineHeight: 1.2 }}>{product.name}</div>
                      <span className={`badge ${product.published ? 'badge-success' : 'badge-warning'}`}>{product.published ? 'Active' : 'Draft'}</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '12px' }}>{product.brand} • {product.category}</div>
                    
                    <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{formatCurrency(product.price)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: stock >= 10 ? 'var(--text-secondary)' : 'var(--color-warning)' }}>
                          <Package size={12} /> {stock} left
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEditEditor(product)}><Edit size={12} /> Edit</button>
                        {stock < 10 && (
                          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleReorder(product.id)} title="Quick Reorder 20 Items">Reorder</button>
                        )}
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteProduct(product)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="data-table-footer">
          <span>Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}</span>
          <div className="pagination">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <button key={i} className={`pagination-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* RICH ADD/EDIT PRODUCT MODAL */}
      {tempProduct && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <span className="modal-title">{isAdding ? 'Add New Product' : `Edit Product: ${tempProduct.name}`}</span>
              <button onClick={() => setTempProduct(null)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            
            {/* Tab Headers */}
            <div className="sfm-tabs" style={{ padding: '12px 24px 0 24px', borderBottom: '1px solid var(--border-secondary)' }}>
              <button className={`sfm-tab ${editorTab === 'basic' ? 'active' : ''}`} type="button" onClick={() => setEditorTab('basic')}>Basic Info</button>
              <button className={`sfm-tab ${editorTab === 'inventory' ? 'active' : ''}`} type="button" onClick={() => setEditorTab('inventory')}>Inventory & Stats</button>
              <button className={`sfm-tab ${editorTab === 'media' ? 'active' : ''}`} type="button" onClick={() => setEditorTab('media')}>Media & Desc</button>
              <button className={`sfm-tab ${editorTab === 'features' ? 'active' : ''}`} type="button" onClick={() => setEditorTab('features')}>Features & Specs</button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                
                {/* 1. BASIC INFO TAB */}
                {editorTab === 'basic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input type="text" className="form-input" required value={tempProduct.name} onChange={e => setTempProduct({ ...tempProduct, name: e.target.value })} placeholder="e.g. Wireless Earbuds Pro Max" />
                    </div>
                    
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">SKU *</label>
                        <input type="text" className="form-input" required value={tempProduct.sku} onChange={e => setTempProduct({ ...tempProduct, sku: e.target.value })} placeholder="ST-EPB-001" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Brand</label>
                        <input type="text" className="form-input" value={tempProduct.brand} onChange={e => setTempProduct({ ...tempProduct, brand: e.target.value })} placeholder="e.g. Apple / Samsung" />
                      </div>
                    </div>

                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <select className="form-select" value={tempProduct.category} onChange={e => setTempProduct({ ...tempProduct, category: e.target.value })}>
                          {categoryNames.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Price (৳) *</label>
                        <input type="number" step="0.01" className="form-input" required value={tempProduct.price || ''} onChange={e => setTempProduct({ ...tempProduct, price: parseFloat(e.target.value) || 0 })} placeholder="৳" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Original Price (৳) - optional</label>
                        <input type="number" step="0.01" className="form-input" value={tempProduct.originalPrice || ''} onChange={e => setTempProduct({ ...tempProduct, originalPrice: parseFloat(e.target.value) || null })} placeholder="No discount" />
                      </div>
                    </div>

                    {/* Jersey Specific Sizes Box */}
                    {(tempProduct.category?.toLowerCase() === 'jersey' || tempProduct.category?.toLowerCase() === 'jerseys') && (
                      <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)', marginTop: '8px' }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 700 }}>👕 Jersey Sizes (জার্সির সাইজ সিলেক্ট করুন)</label>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '12px', marginTop: '2px' }}>এই জার্সির জন্য যে সাইজগুলো এভেইলেবল রাখতে চান, সেগুলো সিলেক্ট করুন:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {['S', 'M', 'L', 'XL', 'XXL', '3XL'].map((label) => {
                            const isEnabled = tempProduct.sizes ? tempProduct.sizes.some(s => s.label === label && s.enabled) : false;
                            return (
                              <div 
                                key={label} 
                                onClick={() => toggleSizeOption(label)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '50px',
                                  height: '35px',
                                  borderRadius: 'var(--radius-md)',
                                  border: isEnabled ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-primary)',
                                  background: isEnabled ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-primary)',
                                  color: isEnabled ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                                  fontWeight: 700,
                                  fontSize: 'var(--text-xs)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  userSelect: 'none',
                                }}
                              >
                                {label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">Product Tag / Badge</label>
                        <select className="form-select" value={tempProduct.badge || ''} onChange={e => setTempProduct({ ...tempProduct, badge: (e.target.value || null) as any })}>
                          <option value="">None</option>
                          <option value="sale">Sale</option>
                          <option value="new">New</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Rating (0-5)</label>
                        <input type="number" min="0" max="5" step="0.1" className="form-input" value={tempProduct.rating} onChange={e => setTempProduct({ ...tempProduct, rating: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Review Count</label>
                        <input type="number" className="form-input" value={tempProduct.reviews} onChange={e => setTempProduct({ ...tempProduct, reviews: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>

                    <div className="grid-2" style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" id="chkInStock" checked={tempProduct.inStock} onChange={e => setTempProduct({ ...tempProduct, inStock: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }} />
                        <label htmlFor="chkInStock" style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', userSelect: 'none', fontWeight: 500 }}>In Stock (Available for Purchase)</label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" id="chkPublished" checked={tempProduct.published} onChange={e => setTempProduct({ ...tempProduct, published: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }} />
                        <label htmlFor="chkPublished" style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', userSelect: 'none', fontWeight: 500 }}>Published (Active Storefront Listing)</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. INVENTORY & STATS TAB */}
                {editorTab === 'inventory' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">Stock Quantity *</label>
                        <input type="number" className="form-input" value={tempProduct.stock ?? ''} onChange={e => setTempProduct({ ...tempProduct, stock: parseInt(e.target.value) || 0 })} placeholder="0" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sold Units (Simulated)</label>
                        <input type="number" className="form-input" value={tempProduct.sold ?? ''} onChange={e => setTempProduct({ ...tempProduct, sold: parseInt(e.target.value) || 0 })} placeholder="0" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total Revenue generated (৳)</label>
                        <input type="number" step="0.01" className="form-input" value={tempProduct.revenue ?? ''} onChange={e => setTempProduct({ ...tempProduct, revenue: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                      </div>
                    </div>
                    <div style={{ padding: 'var(--space-4)', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.15)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <AlertCircle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        <strong>Inventory Notice:</strong> Keeping stock quantities above 10 keeps indicators green. When stock falls below 10, low stock alerts will be triggered on the dashboard.
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. MEDIA & DESC TAB */}
                {editorTab === 'media' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Main Image URL / Upload</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input className="form-input" style={{ flex: 1, minWidth: '200px' }} value={tempProduct.image} onChange={e => setTempProduct({ ...tempProduct, image: e.target.value })} placeholder="https://example.com/image.png" />
                        <label className="btn btn-secondary" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 16px', height: '38px', boxSizing: 'border-box' }}>
                          <Upload size={14} /> Upload Main Image (WebP)
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const webpBase64 = await convertToWebP(file);
                                  setTempProduct({ ...tempProduct, image: webpBase64 });
                                } catch (err) {
                                  alert('ইমেজ রূপান্তর করতে ব্যর্থ হয়েছে।');
                                }
                              }
                            }} 
                          />
                        </label>
                        {tempProduct.image && <img src={tempProduct.image} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-secondary)' }} />}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Video Showcase URL (YouTube or Direct Video Link)</label>
                      <input className="form-input" value={tempProduct.videoUrl || ''} onChange={e => setTempProduct({ ...tempProduct, videoUrl: e.target.value })} placeholder="e.g. https://www.youtube.com/watch?v=... or https://example.com/video.mp4" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Gallery Images</label>
                      <div className="sfm-list-editor">
                        {tempProduct.gallery.map((url, idx) => (
                          <div key={idx} className="sfm-list-editor-row" style={{ marginBottom: '8px', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input className="sfm-input" style={{ flex: 1 }} value={url} onChange={e => {
                              const newGallery = [...tempProduct.gallery];
                              newGallery[idx] = e.target.value;
                              setTempProduct({ ...tempProduct, gallery: newGallery });
                            }} placeholder="Gallery image URL" />
                            <label className="btn btn-secondary btn-sm" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', height: '32px' }}>
                              <Upload size={12} />
                              <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const webpBase64 = await convertToWebP(file);
                                      const newGallery = [...tempProduct.gallery];
                                      newGallery[idx] = webpBase64;
                                      setTempProduct({ ...tempProduct, gallery: newGallery });
                                    } catch (err) {
                                      alert('ইমেজ রূপান্তর করতে ব্যর্থ হয়েছে।');
                                    }
                                  }
                                }} 
                              />
                            </label>
                            {url && <img src={url} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />}
                            <button type="button" className="sfm-btn-icon danger" onClick={() => {
                              setTempProduct({ ...tempProduct, gallery: tempProduct.gallery.filter((_, i) => i !== idx) });
                            }}><X size={14} /></button>
                          </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '4px' }} onClick={() => {
                          setTempProduct({ ...tempProduct, gallery: [...tempProduct.gallery, ''] });
                        }}><Plus size={14} /> Add Gallery Image</button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Additional Photo Content URL / Upload</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input className="form-input" style={{ flex: 1, minWidth: '200px' }} value={tempProduct.photoContent || ''} onChange={e => setTempProduct({ ...tempProduct, photoContent: e.target.value })} placeholder="e.g. https://example.com/extra-photo.png" />
                        <label className="btn btn-secondary" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 16px', height: '38px', boxSizing: 'border-box' }}>
                          <Upload size={14} /> Upload Review Photo (WebP)
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const webpBase64 = await convertToWebP(file);
                                  setTempProduct({ ...tempProduct, photoContent: webpBase64 });
                                } catch (err) {
                                  alert('ইমেজ রূপান্তর করতে ব্যর্থ হয়েছে।');
                                }
                              }
                            }} 
                          />
                        </label>
                        {tempProduct.photoContent && <img src={tempProduct.photoContent} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-secondary)' }} />}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Product Description</label>
                      <textarea className="form-input" style={{ height: '140px', fontFamily: 'inherit', resize: 'vertical' }} value={tempProduct.description} onChange={e => setTempProduct({ ...tempProduct, description: e.target.value })} placeholder="Enter detailed product description and content..." />
                    </div>
                  </div>
                )}

                {/* 4. FEATURES & SPECS TAB */}
                {editorTab === 'features' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Option Selection Panel (Weight, Color, KG, Height, Custom) */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>📏 Available Product Options (প্রোডাক্টের অপশন ও সাইজ সিলেক্ট করুন)</label>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '4px', marginTop: '-12px' }}>
                        কাস্টমার প্রোডাক্ট ভিউ পেজে এই অপশনগুলো থেকে সিলেক্ট করে কার্ট বা অর্ডার করতে পারবে।
                      </p>

                      {/* 1. Colors Input */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colors (রংসমূহ - কমা দিয়ে লিখুন)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={colorsInput}
                          onChange={(e) => {
                            setColorsInput(e.target.value);
                            handleOptionsChange(sizesInput, e.target.value, weightsInput, heightsInput, customInput);
                          }}
                          placeholder="e.g. Red, Black, White"
                        />
                      </div>

                      {/* 2. Weights Input */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weights (ওজনসমূহ - কমা দিয়ে লিখুন)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={weightsInput}
                          onChange={(e) => {
                            setWeightsInput(e.target.value);
                            handleOptionsChange(sizesInput, colorsInput, e.target.value, heightsInput, customInput);
                          }}
                          placeholder="e.g. 2.5kg, 5kg, 10kg, 15kg"
                        />
                      </div>

                      {/* 3. Sizes Input */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sizes (সাইজসমূহ - কমা দিয়ে লিখুন)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={sizesInput}
                          onChange={(e) => {
                            setSizesInput(e.target.value);
                            handleOptionsChange(e.target.value, colorsInput, weightsInput, heightsInput, customInput);
                          }}
                          placeholder="e.g. S, M, L, XL, XXL"
                        />
                      </div>

                      {/* 4. Heights Input */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heights / Dimensions (উচ্চতা/সাইজ - কমা দিয়ে লিখুন)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={heightsInput}
                          onChange={(e) => {
                            setHeightsInput(e.target.value);
                            handleOptionsChange(sizesInput, colorsInput, weightsInput, e.target.value, customInput);
                          }}
                          placeholder="e.g. 4ft, 5ft, 100cm"
                        />
                      </div>

                      {/* 5. Custom Options Input */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Options (অন্যান্য অপশন - কমা দিয়ে লিখুন)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={customInput}
                          onChange={(e) => {
                            setCustomInput(e.target.value);
                            handleOptionsChange(sizesInput, colorsInput, weightsInput, heightsInput, e.target.value);
                          }}
                          placeholder="e.g. Free Size, 12-inch, Heavy Duty"
                        />
                      </div>
                      {/* Options Summary */}
                      <div style={{ marginTop: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {(() => {
                          const enabledSizes = (tempProduct.sizes || []).filter(s => s.enabled);
                          if (enabledSizes.length === 0) return '⚠️ কোনো অপশন সিলেক্ট করা হয়নি — Customer "Free Size" দেখবে।';
                          return `✅ সক্রিয় অপশনসমূহ: ${enabledSizes.map(s => s.label).join(', ')}`;
                        })()}
                      </div>

                      {/* Option Prices Editor */}
                      {(tempProduct.sizes || []).filter(s => s.enabled).length > 0 && (
                        <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-secondary)', paddingTop: '16px' }}>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            💰 Option Prices (অপশন অনুযায়ী কাস্টম দাম সেট করুন - অপশনাল)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {(tempProduct.sizes || []).filter(s => s.enabled).map((opt) => (
                              <div key={opt.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-primary)' }}>
                                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '4px', marginBottom: '2px' }}>{opt.label}</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Discounted Price (৳)</label>
                                    <input
                                      type="number"
                                      placeholder="৳ Price"
                                      value={opt.price || ''}
                                      onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                        const newSizes = (tempProduct.sizes || []).map(s => s.label === opt.label ? { ...s, price: val } : s);
                                        setTempProduct({ ...tempProduct, sizes: newSizes });
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1.5px solid var(--border-primary)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: 'var(--text-xs)',
                                        outline: 'none'
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Original Price (৳)</label>
                                    <input
                                      type="number"
                                      placeholder="৳ Regular"
                                      value={opt.originalPrice || ''}
                                      onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                        const newSizes = (tempProduct.sizes || []).map(s => s.label === opt.label ? { ...s, originalPrice: val } : s);
                                        setTempProduct({ ...tempProduct, sizes: newSizes });
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1.5px solid var(--border-primary)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: 'var(--text-xs)',
                                        outline: 'none'
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '20px' }}></div>

                    <div className="form-group">
                      <label className="form-label">Key Highlights / Features</label>
                      <div className="sfm-list-editor">
                        {tempProduct.features.map((feat, idx) => (
                          <div key={idx} className="sfm-list-editor-row" style={{ marginBottom: '8px' }}>
                            <input className="sfm-input" style={{ flex: 1 }} value={feat} onChange={e => {
                              const newFeatures = [...tempProduct.features];
                              newFeatures[idx] = e.target.value;
                              setTempProduct({ ...tempProduct, features: newFeatures });
                            }} placeholder="e.g. Up to 24 hours of listening time" />
                            <button type="button" className="sfm-btn-icon danger" onClick={() => {
                              setTempProduct({ ...tempProduct, features: tempProduct.features.filter((_, i) => i !== idx) });
                            }}><X size={14} /></button>
                          </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '4px' }} onClick={() => {
                          setTempProduct({ ...tempProduct, features: [...tempProduct.features, ''] });
                        }}><Plus size={14} /> Add Feature Point</button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Product Specifications</label>
                      <div className="sfm-list-editor">
                        {tempProduct.specs.map((spec, idx) => (
                          <div key={idx} className="sfm-list-editor-row" style={{ marginBottom: '8px', gap: '8px' }}>
                            <input className="sfm-input" style={{ flex: 1 }} value={spec.name} onChange={e => {
                              const newSpecs = tempProduct.specs.map((s, i) => i === idx ? { ...s, name: e.target.value } : s);
                              setTempProduct({ ...tempProduct, specs: newSpecs });
                            }} placeholder="Spec name (e.g. Color)" />
                            <input className="sfm-input" style={{ flex: 1 }} value={spec.value} onChange={e => {
                              const newSpecs = tempProduct.specs.map((s, i) => i === idx ? { ...s, value: e.target.value } : s);
                              setTempProduct({ ...tempProduct, specs: newSpecs });
                            }} placeholder="Spec value (e.g. Space Grey)" />
                            <button type="button" className="sfm-btn-icon danger" onClick={() => {
                              setTempProduct({ ...tempProduct, specs: tempProduct.specs.filter((_, i) => i !== idx) });
                            }}><X size={14} /></button>
                          </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '4px' }} onClick={() => {
                          setTempProduct({ ...tempProduct, specs: [...tempProduct.specs, { name: '', value: '' }] });
                        }}><Plus size={14} /> Add Specification Row</button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTempProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isAdding ? 'Create Product' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD SIMULATION MODAL */}
      {showBulkModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">Bulk Catalog Upload</span>
              <button onClick={() => setShowBulkModal(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleBulkUpload}>
              <div className="modal-body">
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '16px' }}>Upload a CSV or Excel sheet containing headers: <strong>Name, SKU, Category, Brand, Price, Stock</strong>.</p>
                <div className="form-group">
                  <label className="form-label">Choose CSV/Excel File</label>
                  <input type="file" className="form-input" required style={{ paddingTop: '8px' }} onChange={() => {}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Simulate Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
