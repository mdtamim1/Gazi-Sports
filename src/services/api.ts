import type { Order } from '../types';

const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE = isLocalDev
  ? `${window.location.protocol}//${window.location.hostname}:5000/api/v1`
  : (import.meta.env.VITE_API_URL || '/api/v1');

// Build helper for authorization token header injection
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Login admin employee via backend
// Step 1: Email + Password → returns pre-auth token (not full access)
export const loginToBackend = async (email: string, password: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  } catch (e) {
    console.error('Failed to connect to authentication server:', e);
    return { status: 'error', message: 'Authentication server is offline or unreachable.' };
  }
};

// Step 2: Google ID Token verification → returns full JWT
export const verifyGoogleStep = async (preAuthToken: string, googleIdToken: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/auth/verify-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preAuthToken, googleIdToken }),
    });
    return await response.json();
  } catch (e) {
    console.error('Failed to verify Google token:', e);
    return { status: 'error', message: 'Google verification failed. Server unreachable.' };
  }
};

// Accept moderator invitation using Google OAuth
export const googleRegisterEmployee = async (token: string, googleIdToken: string, name?: string, password?: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/invite/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, googleIdToken, name, password }),
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'সার্ভারে সংযোগ করা যাচ্ছে না।' };
  }
};

// Check if server is running
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/../health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch (e) {
    return false;
  }
};

// Send Order to backend database
export const sendOrderToBackend = async (orderData: any): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.warn('Backend server is down or unreachable. Falling back to local storage helper.', e);
    return false;
  }
};

// Fetch customer orders matching email or phone
export const fetchCustomerOrdersFromBackend = async (email: string, phone?: string): Promise<Order[] | null> => {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (phone) params.append('phone', phone);

    const response = await fetch(`${API_BASE}/orders/my-orders?${params.toString()}`);
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status !== 'success' || !Array.isArray(result.data)) return null;

    return result.data.map((order: any) => ({
      id: order.id,
      customer: order.customer,
      email: order.email,
      amount: order.amount,
      status: order.status,
      items: order.items,
      date: order.created_at || order.date,
      paymentMethod: order.payment_method || order.paymentMethod,
      storeName: order.store_name || order.storeName,
      phone: order.phone,
      address: order.address,
      courier: order.courier,
      city: order.city,
      thana: order.thana,
      area: order.area,
      customerNote: order.customer_note || order.customerNote,
      shopNote: order.shop_note || order.shopNote,
      paymentType: order.payment_type || order.paymentType,
      memoNumber: order.memo_number || order.memoNumber,
      deliveryCharge: order.delivery_charge || order.deliveryCharge,
      discount: order.discount,
      paidAmount: order.paid_amount || order.paidAmount,
      subtotal: order.subtotal,
      productsList: order.productsList || []
    }));
  } catch (e) {
    console.error('Failed to fetch customer orders from backend:', e);
    return null;
  }
};

// Fetch all orders from backend database (Admin/Staff)
export const fetchOrdersFromBackend = async (): Promise<Order[] | null> => {
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status !== 'success' || !Array.isArray(result.data)) return null;

    return result.data.map((order: any) => ({
      id: order.id,
      customer: order.customer,
      email: order.email,
      amount: order.amount,
      status: order.status,
      items: order.items,
      date: order.created_at || order.date,
      paymentMethod: order.payment_method || order.paymentMethod,
      storeName: order.store_name || order.storeName,
      phone: order.phone,
      address: order.address,
      courier: order.courier,
      city: order.city,
      thana: order.thana,
      area: order.area,
      customerNote: order.customer_note || order.customerNote,
      shopNote: order.shop_note || order.shopNote,
      paymentType: order.payment_type || order.paymentType,
      memoNumber: order.memo_number || order.memoNumber,
      deliveryCharge: order.delivery_charge || order.deliveryCharge,
      discount: order.discount,
      paidAmount: order.paid_amount || order.paidAmount,
      subtotal: order.subtotal,
      assigned_to: order.assigned_to || null,
      assigned_name: order.assigned_name || null,
      productsList: order.productsList || []
    }));
  } catch (e) {
    console.warn('Backend server is down or unreachable. Using frontend localStorage mock data. Error:', e);
    return null;
  }
};

// Update order status in backend database
export const updateOrderStatusInBackend = async (orderId: string, status: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.warn(`Failed to update status for order ${orderId} in backend:`, e);
    return false;
  }
};

// Sync orders: assign unassigned processing orders to active moderators (round-robin)
export const syncOrdersInBackend = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/orders/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return await response.json();
  } catch (e) {
    console.error('Failed to sync orders:', e);
    return { status: 'error', message: 'Server unreachable' };
  }
};

// Assign/reassign a single order to a specific employee
export const assignOrderInBackend = async (orderId: string, assignedTo: string | null): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ assignedTo }),
    });
    return await response.json();
  } catch (e) {
    console.error('Failed to assign order:', e);
    return { status: 'error', message: 'Server unreachable' };
  }
};

// Fetch all active employees for order assignment (not just moderators)
export const fetchActiveEmployees = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE}/employees/active-employees`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return [];
    const result = await response.json();
    if (result.status !== 'success') return [];
    return result.data || [];
  } catch (e) {
    console.warn('Failed to fetch active employees:', e);
    return [];
  }
};

// Backward compatibility alias
export const fetchActiveModerators = fetchActiveEmployees;

// Toggle employee status (active <-> inactive)
export const toggleEmployeeStatusInBackend = async (id: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/${id}/toggle-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to toggle employee status' };
  }
};

// Fetch order logs/history
export const fetchOrderHistory = async (orderId: string): Promise<any[]> => {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/history`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (e) {
    console.warn('Failed to fetch order history:', e);
    return [];
  }
};

// Helper to map backend ID (like "PRD-001") to frontend ID (like 1)
// For legacy seeded products PRD-001..PRD-008, strip to numeric. For all others pass through.
export const toFrontendId = (backendId: string | number): string | number => {
  if (typeof backendId === 'string' && /^PRD-00[1-8]$/.test(backendId)) {
    const num = parseInt(backendId.replace('PRD-00', ''));
    if (!isNaN(num)) return num;
  }
  return backendId;
};

// Helper to map frontend ID to backend ID
// For legacy numeric IDs 1-8, convert to PRD-001..PRD-008. All others pass through as-is.
export const toBackendId = (frontendId: string | number): string => {
  const strId = String(frontendId);
  if (/^[1-8]$/.test(strId)) {
    return `PRD-00${strId}`;
  }
  return strId;
};

// Map backend product schema (snake_case) to frontend product schema (camelCase)
const mapProductToFrontend = (p: any): any => {
  if (!p) return null;
  return {
    id: toFrontendId(p.id),
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand || '',
    category: p.category,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    rating: Number(p.rating || 0),
    reviews: Number(p.reviews || 0),
    image: p.image,
    gallery: p.gallery || [p.image],
    badge: p.badge || (p.original_price && p.price < p.original_price ? 'sale' : null),
    inStock: p.in_stock === 1 || p.in_stock === true || p.stock > 0,
    published: p.published === 1 || p.published === true,
    description: p.description || '',
    features: Array.isArray(p.features) ? p.features : (p.features ? JSON.parse(p.features) : []),
    specs: Array.isArray(p.specs) ? p.specs : (p.specs ? JSON.parse(p.specs) : []),
    stock: p.stock !== undefined ? Number(p.stock) : 0,
    sold: p.sold !== undefined ? Number(p.sold) : 0,
    revenue: p.revenue !== undefined ? Number(p.revenue) : 0,
    customerReviews: p.customerReviews || [],
    videoUrl: p.video_url || null,
    photoContent: p.photo_content || null,
    sizes: Array.isArray(p.sizes) ? p.sizes : (p.sizes ? JSON.parse(p.sizes) : [])
  };
};

const PRODUCTS_CACHE_KEY = 'gazi_products_cache_v1';

export const getCachedProductsFromStorage = (): any[] | null => {
  try {
    const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
};

// Fetch all products from backend SQLite
export const fetchProductsFromBackend = async (): Promise<any[] | null> => {
  try {
    const response = await fetch(`${API_BASE}/products`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return getCachedProductsFromStorage();
    const result = await response.json();
    if (result.status !== 'success' || !Array.isArray(result.data)) return getCachedProductsFromStorage();
    const mapped = result.data.map(mapProductToFrontend);
    try {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(mapped));
    } catch (e) {}
    return mapped;
  } catch (e) {
    console.warn('Backend server offline. Using cached products.', e);
    return getCachedProductsFromStorage();
  }
};

// Fetch a single product by ID from backend SQLite
export const fetchProductByIdFromBackend = async (id: string | number): Promise<any | null> => {
  try {
    const backendId = toBackendId(id);
    const response = await fetch(`${API_BASE}/products/${backendId}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status !== 'success' || !result.data) return null;
    return mapProductToFrontend(result.data);
  } catch (e) {
    console.warn(`Failed to fetch product ${id} from backend:`, e);
    return null;
  }
};

// Create a new product in backend SQLite
export const createProductInBackend = async (productData: any): Promise<any> => {
  try {
    const backendProduct = {
      name: productData.name,
      slug: productData.slug || (productData.name ? productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''),
      sku: productData.sku,
      brand: productData.brand || '',
      category: productData.category || 'Fitness Item',
      price: Number(productData.price || 0),
      original_price: productData.originalPrice ? Number(productData.originalPrice) : null,
      image: productData.image,
      description: productData.description || '',
      stock: Number(productData.stock || 0),
      published: productData.published ? 1 : 0,
      features: productData.features || [],
      specs: productData.specs || [],
      gallery: productData.gallery || [],
      videoUrl: productData.videoUrl || null,
      photoContent: productData.photoContent || null,
      sizes: productData.sizes || []
    };

    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(backendProduct),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return { status: 'error', message: result?.message || `HTTP ${response.status}` };
    }
    return result || { status: 'success' };
  } catch (e: any) {
    console.warn('Failed to save product to backend:', e);
    return { status: 'error', message: e.message || 'Network error' };
  }
};

// Update an existing product in backend SQLite
export const updateProductInBackend = async (id: string | number, productData: any): Promise<boolean> => {
  try {
    const backendId = toBackendId(id);
    const backendProduct = {
      name: productData.name,
      slug: productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku: productData.sku,
      brand: productData.brand || '',
      category: productData.category,
      price: Number(productData.price),
      original_price: productData.originalPrice ? Number(productData.originalPrice) : null,
      image: productData.image,
      description: productData.description || '',
      stock: Number(productData.stock || 0),
      published: productData.published ? 1 : 0,
      features: productData.features,
      specs: productData.specs,
      gallery: productData.gallery,
      videoUrl: productData.videoUrl || null,
      photoContent: productData.photoContent || null,
      sizes: productData.sizes || []
    };

    const response = await fetch(`${API_BASE}/products/${backendId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(backendProduct),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.warn(`Failed to update product ${id} in backend:`, e);
    return false;
  }
};

// Delete a product from backend SQLite
export const deleteProductFromBackend = async (id: string | number): Promise<{ success: boolean; message?: string }> => {
  try {
    // Pass the raw ID — backend handles both numeric and PRD-XXX formats
    const rawId = String(id);
    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(rawId)}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return { success: false, message: result?.message || `HTTP ${response.status}` };
    }
    return { success: result?.status === 'success', message: result?.message };
  } catch (e: any) {
    console.warn(`Failed to delete product ${id} from backend:`, e);
    return { success: false, message: e.message || 'Network error' };
  }
};

// Create a manual order from Admin panel
export const createOrderFromAdminInBackend = async (orderData: any): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.warn('Failed to save manual order to backend:', e);
    return false;
  }
};

// Update an existing order details from Admin panel
export const updateOrderInBackend = async (orderId: string, orderData: any): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.warn(`Failed to update order ${orderId} in backend:`, e);
    return false;
  }
};

// Fetch dynamic aggregated statistics from backend database for administration dashboard
export const fetchDashboardStats = async (): Promise<any | null> => {
  try {
    const response = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status !== 'success') return null;
    return result.data;
  } catch (e) {
    console.warn('Backend server offline or statistics unavailable. Falling back to mock dataset.', e);
    return null;
  }
};

// Fetch system settings from backend database
export const fetchSystemSettings = async (): Promise<any | null> => {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status !== 'success') return null;
    return result.data;
  } catch (e) {
    console.warn('Backend server offline or settings unavailable. Using mock settings.', e);
    return null;
  }
};

// Save updated system settings to backend database
export const saveSystemSettings = async (settingsData: any): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(settingsData),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.warn('Failed to save system settings to backend:', e);
    return false;
  }
};

// Fetch support chat history logs from backend database
export const fetchChatHistory = async (): Promise<any[] | null> => {
  try {
    const response = await fetch(`${API_BASE}/chats`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status !== 'success' || !Array.isArray(result.data)) return null;
    return result.data;
  } catch (e) {
    console.warn('Failed to load chat history from backend:', e);
    return null;
  }
};

// Synchronize customer messages read flag status in database
export const markCustomerChatAsRead = async (customerId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/chats/read/${customerId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.warn(`Failed to mark customer ${customerId} chats as read:`, e);
    return false;
  }
};

// Fetch registered employees
export const fetchEmployees = async (): Promise<any[] | null> => {
  try {
    const res = await fetch(`${API_BASE}/employees`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch (e) {
    return null;
  }
};

// Update employee status, role, department
export const updateEmployee = async (id: string, data: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to update employee' };
  }
};

// Delete employee
export const deleteEmployee = async (id: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete employee' };
  }
};

// Fetch invitations
export const fetchInvitations = async (): Promise<any[] | null> => {
  try {
    const res = await fetch(`${API_BASE}/employees/invitations`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch (e) {
    return null;
  }
};

// Create invitation
export const inviteEmployee = async (data: { email: string; role_id: number }): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to invite employee' };
  }
};

// Revoke/Delete invitation
export const deleteInvitation = async (id: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/invitations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete invitation' };
  }
};

// Fetch roles
export const fetchRoles = async (): Promise<any[] | null> => {
  try {
    const res = await fetch(`${API_BASE}/employees/roles`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch (e) {
    return null;
  }
};

// Create custom role
export const createRole = async (data: { name: string; description: string; permissions: string[] }): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to create role' };
  }
};

// Update custom role
export const updateRole = async (id: number, data: { name: string; description: string; permissions: string[] }): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/roles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to update role' };
  }
};

// Delete custom role
export const deleteRole = async (id: number): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/roles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete role' };
  }
};

// Verify invitation token (Public)
export const verifyInvitationToken = async (token: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/invite/verify?token=${encodeURIComponent(token)}`);
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'সার্ভারে সংযোগ করা যাচ্ছে না।' };
  }
};

// Register invited employee (Public)
export const registerEmployee = async (data: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/employees/invite/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'সার্ভারে সংযোগ করা যাচ্ছে না।' };
  }
};

// Fetch promo coupons
export const fetchCoupons = async (): Promise<any[] | null> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/coupons`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch (e) {
    return null;
  }
};

// Create a coupon
export const createCoupon = async (data: { code: string; type: string; value: number; expiry: string }): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to create coupon' };
  }
};

// Delete a coupon
export const deleteCoupon = async (code: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete coupon' };
  }
};

// Validate coupon for checkout (Public)
export const validateCouponCode = async (code: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/coupons/validate/${encodeURIComponent(code)}`);
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'সার্ভারে সংযোগ করা যাচ্ছে না।' };
  }
};

// Fetch Spin Wheel configuration (Public)
export const fetchSpinWheelConfig = async (): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/spin-wheel`);
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to fetch spin wheel settings' };
  }
};

// Play Spin Wheel (Server-calculated outcome picker)
export const playSpinWheel = async (customerEmail?: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/spin-wheel/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_email: customerEmail || '' })
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to play spin wheel' };
  }
};

// Update Spin Wheel settings (Admin Protected)
export const updateSpinWheelSettings = async (payload: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/spin-wheel/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to update spin wheel settings' };
  }
};

// Fetch Customer Account Coupons (Public/Customer)
export const fetchCustomerCoupons = async (email: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/my-coupons?email=${encodeURIComponent(email)}`);
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to fetch customer coupons' };
  }
};

// Dispatch Direct Coupon to Customer Accounts (Admin Protected)
export const dispatchDirectOffer = async (payload: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/dispatch-coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to dispatch offer' };
  }
};

// Fetch Active Auto-Dispatch Campaigns (Admin Protected)
export const fetchAutoDispatchCoupons = async (): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/auto-dispatch-coupons`, {
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to fetch auto-dispatch campaigns' };
  }
};

// Stop/Delete Auto-Dispatch Campaign (Admin Protected)
export const stopAutoDispatchCoupon = async (id: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/auto-dispatch-coupons/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to stop campaign' };
  }
};

// Fetch newsletter subscribers
export const fetchSubscribers = async (): Promise<any[] | null> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/subscribers`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch (e) {
    return null;
  }
};

// Subscribe to newsletter (Public)
export const subscribeToNewsletter = async (email: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/subscribers/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'সার্ভারে সংযোগ করা যাচ্ছে না।' };
  }
};

// Delete subscriber from log
export const deleteSubscriber = async (id: number): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/subscribers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete subscriber' };
  }
};

// Fetch live advanced analytics
export const fetchAnalyticsData = async (range: string): Promise<any | null> => {
  try {
    const res = await fetch(`${API_BASE}/analytics?range=${encodeURIComponent(range)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch (e) {
    return null;
  }
};

// Fetch campaigns from backend (Public)
export const fetchCampaignsFromBackend = async (): Promise<any[] | null> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/campaigns`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.status === 'success' ? json.data : null;
  } catch (e) {
    return null;
  }
};

// Create campaign in backend
export const createCampaignInBackend = async (campaignData: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(campaignData)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to create campaign' };
  }
};

// Update campaign status in backend
export const updateCampaignInBackend = async (id: string, status: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/campaigns/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status })
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to update campaign' };
  }
};

// Delete campaign from backend
export const deleteCampaignFromBackend = async (id: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/marketing/campaigns/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete campaign' };
  }
};

// --- BLOG APIS ---

export const fetchBlogsFromBackend = async (): Promise<any[]> => {
  try {
    const res = await fetch(`${API_BASE}/blogs`);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (e) {
    console.error('Failed to fetch blogs:', e);
    return [];
  }
};

export const fetchBlogBySlugFromBackend = async (slug: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/blogs/${slug}`);
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    console.error(`Failed to fetch blog with slug "${slug}":`, e);
    return null;
  }
};

export const createBlogInBackend = async (blogData: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(blogData)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to create blog' };
  }
};

export const updateBlogInBackend = async (id: string, blogData: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/blogs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(blogData)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to update blog' };
  }
};

export const deleteBlogFromBackend = async (id: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/blogs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete blog' };
  }
};

// ============================================
// EVENTS & ACHIEVEMENTS SERVICES
// ============================================

export const fetchEventsFromBackend = async (): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/events`);
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to fetch events' };
  }
};

export const createEventInBackend = async (eventData: any): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(eventData)
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to create event' };
  }
};

export const deleteEventFromBackend = async (id: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to delete event' };
  }
};

export const fetchCustomerAchievements = async (email: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/events/achievements?email=${encodeURIComponent(email)}`);
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to fetch customer achievements' };
  }
};

export const addCustomerAchievement = async (eventId: string, customerEmail: string): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/events/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, customerEmail })
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to submit event achievement' };
  }
};

export const fetchSecurityLogs = async (
  page: number,
  limit: number,
  email?: string,
  actionType?: string,
  date?: string
): Promise<any> => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (email) params.append('email', email);
    if (actionType) params.append('action_type', actionType);
    if (date) params.append('date', date);

    const res = await fetch(`${API_BASE}/security/logs?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: 'Failed to fetch security logs' };
  }
};






