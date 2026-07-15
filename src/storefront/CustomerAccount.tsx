import { useState, useEffect, useRef } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Calendar, ShoppingBag, MessageSquare, LogOut, 
  Lock, ArrowRight, ShieldCheck, MapPin, Truck, CheckCircle2, 
  Clock, AlertCircle, HelpCircle, Send, Plus, ArrowLeft, RefreshCw,
  Trash2, Edit, X, Heart, ShoppingCart, Ticket, Menu, RotateCcw, Trophy
} from 'lucide-react';
import { fetchOrdersFromBackend, fetchCustomerOrdersFromBackend, fetchChatHistory } from '../services/api';
import { generateOrders as getOrders } from '../mock/data';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { CustomerCouponsTab } from './CustomerCouponsTab';
import { CustomerEventsTab } from './CustomerEventsTab';
import './storefront-account.css';

interface OrderItem {
  id: number | string;
  customer: string;
  email: string;
  phone: string;
  amount: number;
  status: string;
  items: number;
  date: string;
  created_at?: string;
  paymentMethod: string;
  courier?: string;
  city?: string;
  address?: string;
}

interface ChatMessage {
  id: string;
  customerId: string;
  customerName: string;
  sender: 'customer' | 'admin';
  message: string;
  timestamp: string;
  read: boolean;
}

export default function CustomerAccount() {
  const { 
    customer, 
    login, 
    register, 
    logout, 
    updateCustomerProfile,
    addCustomerAddress,
    updateCustomerAddress,
    deleteCustomerAddress,
    setDefaultCustomerAddress
  } = useCustomerAuth();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, wishlist, cart, cartTotal, updateQuantity } = useOutletContext<any>() || { wishlist: [], cart: [], cartTotal: 0, addToCart: () => {}, toggleWishlist: () => {}, updateQuantity: () => {} };
  const [config] = useStorefrontConfig();

  // Auth UI Form states
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showGoogleAccounts, setShowGoogleAccounts] = useState(false);

  // Floating 3D Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'coupons' | 'events' | 'addresses' | 'wishlist' | 'cart' | 'chat'>('profile');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // Chat/Messaging State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Profile edit states
  const [profileName, setProfileName] = useState(customer?.name || '');
  const [profilePhone, setProfilePhone] = useState(customer?.phone || '');
  const [profileAddress, setProfileAddress] = useState(customer?.address || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Saved Address Form/Modal states
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [addressLabel, setAddressLabel] = useState('বাসা (Home)');
  const [addressName, setAddressName] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressError, setAddressError] = useState('');

  const resetAddressForm = () => {
    setEditingAddress(null);
    setAddressLabel('বাসা (Home)');
    setAddressName('');
    setAddressPhone('');
    setAddressDetail('');
    setAddressIsDefault(false);
    setAddressError('');
    setIsAddressModalOpen(false);
  };

  const openAddAddressModal = () => {
    resetAddressForm();
    setAddressName(customer?.name || '');
    setAddressPhone(customer?.phone || '');
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: any) => {
    setEditingAddress(addr);
    setAddressLabel(addr.label);
    setAddressName(addr.name);
    setAddressPhone(addr.phone);
    setAddressDetail(addr.address);
    setAddressIsDefault(!!addr.isDefault);
    setAddressError('');
    setIsAddressModalOpen(true);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');

    if (!addressLabel.trim()) {
      setAddressError('লেবেল (যেমন: বাসা, অফিস) খালি রাখা যাবে না।');
      return;
    }
    if (!addressName.trim()) {
      setAddressError('নাম খালি রাখা যাবে না।');
      return;
    }
    if (!addressPhone.trim()) {
      setAddressError('মোবাইল নম্বর খালি রাখা যাবে না।');
      return;
    }
    if (!addressDetail.trim()) {
      setAddressError('বিস্তারিত ঠিকানা খালি রাখা যাবে না।');
      return;
    }

    const addrData = {
      label: addressLabel.trim(),
      name: addressName.trim(),
      phone: addressPhone.trim(),
      address: addressDetail.trim(),
      isDefault: addressIsDefault
    };

    try {
      if (editingAddress) {
        updateCustomerAddress(editingAddress.id, addrData);
      } else {
        addCustomerAddress(addrData);
      }
      resetAddressForm();
    } catch (err) {
      setAddressError('ঠিকানা সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  useEffect(() => {
    if (customer) {
      setProfileName(customer.name || '');
      setProfilePhone(customer.phone || '');
      setProfileAddress(customer.address || '');
      setProfileSuccess('');
      setProfileError('');
    }
  }, [customer]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!customer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        sender: 'customer',
        message: base64String,
        timestamp: new Date().toISOString(),
        read: false
      };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'message',
          customerId: customer.id,
          customerName: customer.name,
          sender: 'customer',
          message: base64String
        }));
      } else {
        const storedChats = localStorage.getItem('storefront_chats');
        let allChats: ChatMessage[] = [];
        if (storedChats) {
          try {
            allChats = JSON.parse(storedChats);
          } catch (e) {}
        }
        syncChatData([...allChats, newMessage]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileName.trim()) {
      setProfileError('নাম খালি রাখা যাবে না।');
      return;
    }
    if (!profilePhone.trim()) {
      setProfileError('মোবাইল নম্বর খালি রাখা যাবে না।');
      return;
    }

    try {
      updateCustomerProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        address: profileAddress.trim()
      });
      setProfileSuccess('আপনার প্রোফাইল তথ্য সফলভাবে আপডেট করা হয়েছে!');
    } catch (err) {
      setProfileError('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  // Load orders with persistent caching and dedicated backend customer lookup
  const loadCustomerOrders = async () => {
    if (!customer) return;
    setLoadingOrders(true);
    try {
      const custEmail = (customer.email || '').toLowerCase().trim();
      const custPhone = (customer.phone || '').replace(/[^0-9]/g, '');
      const cacheKey = `customer_orders_${custEmail || custPhone}`;

      // 1. Fetch directly from customer backend route & general orders
      const backendCustomerOrders = await fetchCustomerOrdersFromBackend(customer.email, customer.phone);
      const generalOrders = await fetchOrdersFromBackend();
      
      // 2. Fetch local storage orders (Admin local edits & offline fallback)
      let localOrderList: any[] = [];
      try {
        const storedOrderList = localStorage.getItem('orderList');
        if (storedOrderList) localOrderList = JSON.parse(storedOrderList);
      } catch (e) {}

      let cachedOrders: any[] = [];
      try {
        const storedCache = localStorage.getItem(cacheKey);
        if (storedCache) cachedOrders = JSON.parse(storedCache);
      } catch (e) {}

      const mockFallback = getOrders() || [];

      // Helper matcher function
      const isOrderForCustomer = (o: any) => {
        if (!o) return false;
        const oEmail = (o.email || '').toLowerCase().trim();
        const oPhone = (o.phone || '').replace(/[^0-9]/g, '');

        const emailMatch = Boolean(custEmail && (oEmail === custEmail || oPhone === custEmail));
        const phoneMatch = Boolean(custPhone && custPhone.length >= 6 && (
          oPhone === custPhone || 
          oEmail === custPhone || 
          (oPhone.length >= 10 && custPhone.endsWith(oPhone.slice(-10))) ||
          (custPhone.length >= 10 && oPhone.endsWith(custPhone.slice(-10)))
        ));

        return emailMatch || phoneMatch;
      };

      const matchedMap = new Map<string, any>();

      // Base layer: mock & old local cache
      [...mockFallback, ...cachedOrders].forEach((o: any) => {
        if (o && o.id && isOrderForCustomer(o)) {
          matchedMap.set(String(o.id), o);
        }
      });

      // Layer 2: Admin local edits from orderList
      localOrderList.forEach((o: any) => {
        if (o && o.id && isOrderForCustomer(o)) {
          const existing = matchedMap.get(String(o.id)) || {};
          matchedMap.set(String(o.id), {
            ...existing,
            ...o
          });
        }
      });

      // Layer 3: Direct Backend DB Orders (HIGHEST PRIORITY - Overwrites status & courier with live database values)
      [...(generalOrders || []), ...(backendCustomerOrders || [])].forEach((o: any) => {
        if (o && o.id && isOrderForCustomer(o)) {
          const existing = matchedMap.get(String(o.id)) || {};
          matchedMap.set(String(o.id), {
            ...existing,
            ...o,
            status: o.status || existing.status || 'processing',
            courier: o.courier || existing.courier || 'Pathao Courier'
          });
        }
      });

      const finalOrders = Array.from(matchedMap.values()).sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.created_at || 0).getTime();
        const dateB = new Date(b.date || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      // Save updated persistent cache
      localStorage.setItem(cacheKey, JSON.stringify(finalOrders));
      setOrders(finalOrders as any[]);
    } catch (e) {
      console.error('Error loading customer orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Sync state & localStorage
  const syncChatData = (updated: ChatMessage[]) => {
    localStorage.setItem('storefront_chats', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    
    if (customer) {
      const filtered = updated.filter(m => m.customerId === customer.id);
      setChatMessages(filtered);
    }
  };

  const loadChatsLocal = () => {
    if (!customer) return;
    const stored = localStorage.getItem('storefront_chats');
    if (stored) {
      try {
        const allChats: ChatMessage[] = JSON.parse(stored);
        const filtered = allChats.filter(m => m.customerId === customer.id);
        setChatMessages(filtered);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (customer) {
      loadCustomerOrders();

      const initializeChat = async () => {
        // 1. Fetch history from SQLite Database
        const history = await fetchChatHistory();
        if (history && history.length > 0) {
          syncChatData(history);
        } else {
          loadChatsLocal();
        }

        // 2. Open WebSocket
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const wsHost = isLocalDev ? 'localhost:5000' : 'api.tamimglobal.com';
        const wsUrl = `${wsProto}//${wsHost}/ws/chat`;

        try {
          const ws = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen = () => {
            console.log('⚡ Storefront support chat WebSocket connection open.');
          };

          ws.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data);
              if (payload.type === 'message') {
                const newMsg: ChatMessage = payload.data;
                
                const stored = localStorage.getItem('storefront_chats');
                let chatsList: ChatMessage[] = [];
                if (stored) {
                  try {
                    chatsList = JSON.parse(stored);
                  } catch (e) {}
                }
                
                if (!chatsList.some(m => m.id === newMsg.id)) {
                  const updated = [...chatsList, newMsg];
                  syncChatData(updated);
                }
              }
            } catch (e) {
              console.error('Error parsing WebSocket message content:', e);
            }
          };

          ws.onerror = (err) => {
            console.warn('Storefront WebSocket connection error. Using local storage fallback polling.', err);
          };

          ws.onclose = () => {
            console.warn('Storefront WebSocket connection closed. Using local storage fallback polling.');
          };
        } catch (err) {
          console.warn('Storefront WebSocket setup failed. Using local storage fallback polling.', err);
        }
      };

      initializeChat();

      // Fallback polling just in case WebSocket is down
      const timer = setInterval(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          return;
        }
        loadChatsLocal();
      }, 3000);

      return () => {
        clearInterval(timer);
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  }, [customer]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);



  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (isRegister) {
      if (!authName || !authEmail || !authPassword || !authPhone) {
        setAuthError('দয়া করে সবগুলো ঘর পূরণ করুন।');
        return;
      }
      const res = await register(authName, authEmail, authPassword, authPhone);
      if (!res.success) {
        setAuthError(res.error || 'নিবন্ধন ব্যর্থ হয়েছে।');
      } else {
        setAuthSuccess('অ্যাকাউন্ট তৈরি সফল হয়েছে!');
      }
    } else {
      if (!authEmail || !authPassword) {
        setAuthError('ইমেইল ও পাসওয়ার্ড প্রদান করুন।');
        return;
      }
      const res = await login(authEmail, authPassword);
      if (!res.success) {
        setAuthError(res.error || 'লগইন ব্যর্থ হয়েছে।');
      }
    }
  };



  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !inputMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      customerId: customer.id,
      customerName: customer.name,
      sender: 'customer',
      message: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        customerId: customer.id,
        customerName: customer.name,
        sender: 'customer',
        message: inputMessage.trim()
      }));
    } else {
      // Fallback local storage update
      const storedChats = localStorage.getItem('storefront_chats');
      let allChats: ChatMessage[] = [];
      if (storedChats) {
        try {
          allChats = JSON.parse(storedChats);
        } catch (e) {}
      }

      const updatedChats = [...allChats, newMessage];
      syncChatData(updatedChats);

      // Trigger dummy auto-reply for demo if no admin replies in 4s (just for visual delight when offline)
      setTimeout(() => {
        const stored = localStorage.getItem('storefront_chats');
        if (stored) {
          const chats: ChatMessage[] = JSON.parse(stored);
          const lastMsg = chats.filter(m => m.customerId === customer.id).pop();
          if (lastMsg && lastMsg.sender === 'customer') {
            const autoReply: ChatMessage = {
              id: `msg-reply-${Date.now()}`,
              customerId: customer.id,
              customerName: customer.name,
              sender: 'admin',
              message: `ধন্যবাদ ${customer.name}! আমরা আপনার মেসেজটি পেয়েছি। আমাদের কাস্টমার প্রতিনিধি শীঘ্রই যোগাযোগ করবে।`,
              timestamp: new Date().toISOString(),
              read: false
            };
            syncChatData([...chats, autoReply]);
          }
        }
      }, 4000);
    }
    
    setInputMessage('');
  };

  // Order tracking status helper
  const getTrackingSteps = (status: string) => {
    const steps = [
      { key: 'placed', label: 'অর্ডার প্লেসড', desc: 'অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে', icon: Clock },
      { key: 'processing', label: 'প্রসেসিং', desc: 'প্যাকেজিং ও ভেরিফিকেশন চলছে', icon: RefreshCw },
      { key: 'shipped', label: 'কুরিয়ারে পাঠানো হয়েছে', desc: 'পণ্যটি কুরিয়ারে হস্তান্তর করা হয়েছে', icon: Truck },
      { key: 'delivered', label: 'ডেলিভার্ড', desc: 'অর্ডারটি আপনার কাছে পৌঁছে গেছে', icon: CheckCircle2 }
    ];

    const lowerStatus = (status || '').toLowerCase().trim();
    let activeIndex = 0;
    if (lowerStatus === 'processing') activeIndex = 1;
    else if (lowerStatus === 'shipped' || lowerStatus === 'shipping') activeIndex = 2;
    else if (lowerStatus === 'delivered' || lowerStatus === 'completed') activeIndex = 3;
    else if (lowerStatus === 'cancelled' || lowerStatus === 'returned') activeIndex = -1;

    return { steps, activeIndex, isCancelled: lowerStatus === 'cancelled', isReturned: lowerStatus === 'returned' };
  };

  if (!customer) {
    return (
      <div className="account-auth-container" style={{ maxWidth: '460px', margin: '60px auto', padding: '0 16px' }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: 'var(--sf-radius-lg)', border: '1px solid var(--sf-border)', boxShadow: 'var(--sf-shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--sf-bg-light)', color: 'var(--sf-accent)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <User size={24} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>
              {isRegister ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'কাস্টমার অ্যাকাউন্টে লগইন'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-tertiary)', marginTop: '4px' }}>
              {isRegister ? 'সহজ ট্র্যাকিং ও চ্যাট সাপোর্ট পেতে অ্যাকাউন্ট তৈরি করুন' : 'অর্ডার ট্র্যাক এবং কাস্টমার সাপোর্টে যোগাযোগ করতে লগইন করুন'}
            </p>
          </div>

          {authError && (
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {authError}
            </div>
          )}

          {authSuccess && (
            <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {authSuccess}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isRegister && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>আপনার নাম *</label>
                  <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="যেমন: মো: রহিম" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>মোবাইল নম্বর *</label>
                  <input type="tel" required value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="যেমন: ০১৭XXXXXXXX" />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>ইমেইল ঠিকানা *</label>
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="যেমন: example@gmail.com" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>পাসওয়ার্ড *</label>
              <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="পাসওয়ার্ড দিন" />
            </div>

            <button type="submit" style={{ width: '100%', height: '44px', background: 'var(--sf-text-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
              {isRegister ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'} <ArrowRight size={16} />
            </button>
          </form>



          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--sf-text-secondary)' }}>
            {isRegister ? (
              <>
                অলরেডি একটি অ্যাকাউন্ট আছে?{' '}
                <button onClick={() => { setIsRegister(false); setAuthError(''); }} style={{ background: 'none', border: 'none', color: 'var(--sf-accent)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  লগইন করুন
                </button>
              </>
            ) : (
              <>
                কোনো অ্যাকাউন্ট নেই?{' '}
                <button onClick={() => { setIsRegister(true); setAuthError(''); }} style={{ background: 'none', border: 'none', color: 'var(--sf-accent)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  অ্যাকাউন্ট তৈরি করুন
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>কাস্টমার পোর্টাল</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--sf-text-tertiary)' }}>স্বাগতম, {customer.name}!</p>
        </div>
        <button onClick={logout} className="store-btn" style={{ height: '40px', background: 'white', border: '1.5px solid var(--sf-border)', color: '#ef4444', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', padding: '0 16px' }}>
          <LogOut size={16} /> লগআউট করুন
        </button>
      </div>

      {/* Mobile Drawer Toggle Bar */}
      <div className="account-mobile-bar">
        <button 
          onClick={() => setIsMobileDrawerOpen(true)}
          className="account-drawer-toggle-btn"
        >
          <Menu size={18} />
          <span>একাউন্ট মেনু (Account Menu)</span>
        </button>

        <button 
          onClick={() => setIsChatOpen(true)}
          className="account-mobile-chat-trigger-btn"
        >
          <MessageSquare size={16} />
          <span>লাইভ চ্যাট</span>
        </button>
      </div>

      {/* Backdrop Overlay for Mobile Side Drawer */}
      {isMobileDrawerOpen && (
        <div 
          className="account-drawer-overlay"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      <div className="store-products-layout">
        
        {/* Navigation Sidebar / Mobile Slide Drawer */}
        <div className={`account-sidebar ${isMobileDrawerOpen ? 'drawer-open' : ''}`}>
          {/* Drawer Header (Mobile Only) */}
          <div className="mobile-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                {customer.avatar || 'C'}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--sf-text-primary)', fontSize: '0.9rem' }}>{customer.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-tertiary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email}</div>
              </div>
            </div>
            <button onClick={() => setIsMobileDrawerOpen(false)} className="drawer-close-btn" aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          <button 
            onClick={() => { setActiveTab('profile'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'profile' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'profile' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <User size={18} /> প্রোফাইল তথ্য (Profile)
          </button>
          
          <button 
            onClick={() => { setActiveTab('orders'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'orders' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'orders' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <ShoppingBag size={18} /> আমার অর্ডারসমূহ ({orders.length})
          </button>
          
          <button 
            onClick={() => { setActiveTab('events'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'events' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'events' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Trophy size={18} style={{ color: '#fbbf24' }} /> ইভেন্টসমূহ (Events)
          </button>

          <button 
            onClick={() => { setActiveTab('coupons'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'coupons' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'coupons' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Ticket size={18} /> আমার কুপন ও অফারসমূহ
          </button>

          <button 
            onClick={() => { setActiveTab('addresses'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'addresses' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'addresses' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <MapPin size={18} /> সংরক্ষিত ঠিকানা ({customer.addresses?.length || 0})
          </button>
          
          <button 
            onClick={() => { setActiveTab('wishlist'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'wishlist' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'wishlist' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Heart size={18} /> আমার উইশলিস্ট ({wishlist.length})
          </button>
          
          <button 
            onClick={() => { setActiveTab('cart'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'cart' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'cart' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <ShoppingCart size={18} /> শপিং কার্ট ({cart.reduce((s: number, i: any) => s + i.quantity, 0)})
          </button>

          {/* Divider */}
          <div style={{ margin: '12px 0', borderTop: '1px solid var(--sf-border)' }} />

          {/* Support Box */}
          <div style={{ padding: '10px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)', border: '1px dashed var(--sf-accent)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sf-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>কাস্টমার সাপোর্ট</div>
            <button 
              onClick={() => { setIsChatOpen(true); setIsMobileDrawerOpen(false); }}
              style={{ width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', color: 'white', border: 'none', borderRadius: '6px', textAlign: 'left', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
            >
              <MessageSquare size={16} /> 24/7 লাইভ চ্যাট সাহায্য
            </button>
          </div>

          {/* Logout Action */}
          <button 
            onClick={() => { logout(); navigate('/'); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}
          >
            <LogOut size={16} /> লগআউট করুন (Logout)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="account-content-card">
          
          {/* EVENTS TAB */}
          {activeTab === 'events' && <CustomerEventsTab />}

          {/* MY COUPONS TAB */}
          {activeTab === 'coupons' && <CustomerCouponsTab email={customer.email} />}

          {/* SAVED ADDRESSES TAB */}
          {activeTab === 'addresses' && (
            <div>
              <div className="addresses-section-header" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>
                  <MapPin size={20} style={{ color: 'var(--sf-accent)' }} /> সংরক্ষিত ডেলিভারি ঠিকানা (Saved Address Book)
                </h3>
                <button 
                  onClick={openAddAddressModal} 
                  className="address-action-btn set-default"
                  style={{ width: 'auto', padding: '0 16px', height: '38px', borderRadius: '8px' }}
                >
                  <Plus size={16} /> নতুন ঠিকানা যোগ করুন
                </button>
              </div>

              {!customer.addresses || customer.addresses.length === 0 ? (
                <div className="address-empty-state">
                  <MapPin size={48} style={{ opacity: 0.3, color: 'var(--sf-accent)' }} />
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '12px 0 4px 0' }}>আপনার কোনো ঠিকানা সংরক্ষিত নেই</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-secondary)', margin: 0 }}>ভবিষ্যতে ১-ক্লিকে দ্রুত অর্ডার করার জন্য এখানে আপনার বাসা বা অফিসের ঠিকানা সংরক্ষণ করুন।</p>
                  <button 
                    onClick={openAddAddressModal}
                    style={{ marginTop: '16px', padding: '10px 20px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> ঠিকানা যোগ করুন
                  </button>
                </div>
              ) : (
                <div className="address-grid">
                  {customer.addresses.map((addr) => (
                    <div key={addr.id} className={`address-card ${addr.isDefault ? 'default-address' : ''}`}>
                      <div>
                        <div className="address-card-header">
                          <span className="address-label">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="address-default-badge">
                              <CheckCircle2 size={12} /> ডিফল্ট
                            </span>
                          )}
                        </div>
                        
                        <div className="address-card-body" style={{ marginTop: '12px' }}>
                          <div className="address-user-name">{addr.name}</div>
                          <div className="address-user-phone">📞 {addr.phone}</div>
                          <div className="address-details">{addr.address}</div>
                        </div>
                      </div>

                      <div className="address-card-actions">
                        {!addr.isDefault && (
                          <button 
                            onClick={() => setDefaultCustomerAddress(addr.id)} 
                            className="address-action-btn set-default"
                          >
                            ডিফল্ট করুন
                          </button>
                        )}
                        <button 
                          onClick={() => openEditAddressModal(addr)} 
                          className="address-action-btn"
                        >
                          <Edit size={12} /> এডিট
                        </button>
                        <button 
                          onClick={() => deleteCustomerAddress(addr.id)} 
                          className="address-action-btn" 
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={12} /> ডিলিট
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>প্রোফাইল বিবরণী</h3>
              
              <div className="profile-badge-row">
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: 'white' }}>
                  {customer.avatar || 'C'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>{customer.name}</h4>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'var(--sf-bg-light)', color: 'var(--sf-accent)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Verified Customer
                    </span>
                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--sf-success)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px' }}>
                      সদস্যপদ: {new Date(customer.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })}
                    </span>
                  </div>
                </div>
              </div>

              {profileSuccess && (
                <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> {profileSuccess}
                </div>
              )}

              {profileError && (
                <div style={{ background: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <AlertCircle size={16} /> {profileError}
                </div>
              )}

              <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>পূর্ণ নাম *</label>
                    <input 
                      type="text" 
                      required 
                      value={profileName} 
                      onChange={e => setProfileName(e.target.value)} 
                      style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', background: 'var(--sf-bg-light)', color: 'var(--sf-text-primary)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>ইমেইল (পরিবর্তনযোগ্য নয়)</label>
                    <input 
                      type="email" 
                      disabled 
                      value={customer.email} 
                      style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', background: '#e2e8f0', color: 'var(--sf-text-secondary)', cursor: 'not-allowed' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>মোবাইল নম্বর *</label>
                    <input 
                      type="tel" 
                      required 
                      value={profilePhone} 
                      onChange={e => setProfilePhone(e.target.value)} 
                      style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', background: 'var(--sf-bg-light)', color: 'var(--sf-text-primary)' }} 
                      placeholder="যেমন: ০১৭XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>রেজিস্ট্রেশন তারিখ</label>
                    <input 
                      type="text" 
                      disabled 
                      value={new Date(customer.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })} 
                      style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', background: '#e2e8f0', color: 'var(--sf-text-secondary)', cursor: 'not-allowed' }} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>ডেলিভারি ঠিকানা</label>
                  <textarea 
                    value={profileAddress} 
                    onChange={e => setProfileAddress(e.target.value)} 
                    style={{ width: '100%', minHeight: '80px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '10px 12px', outline: 'none', background: 'var(--sf-bg-light)', color: 'var(--sf-text-primary)', resize: 'vertical', fontFamily: 'inherit' }} 
                    placeholder="বাসা/হোল্ডিং নং, রোড নং, এলাকা, থানা ও জেলা বিস্তারিত লিখুন"
                  />
                </div>

                <button 
                  type="submit" 
                  style={{ height: '44px', background: 'var(--sf-text-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 24px', alignSelf: 'flex-start', transition: 'background 0.2s' }}
                >
                  তথ্য সংরক্ষণ করুন (Save Profile)
                </button>
              </form>

              {/* SAVED ADDRESSES SECTION */}
              <div className="addresses-section">
                <div className="addresses-section-header">
                  <h4 className="addresses-section-title">
                    <MapPin size={18} /> সংরক্ষিত ডেলিভারি ঠিকানা (Saved Addresses)
                  </h4>
                  <button 
                    onClick={openAddAddressModal} 
                    className="address-action-btn set-default"
                    style={{ width: 'auto', padding: '0 16px', height: '36px' }}
                  >
                    <Plus size={14} /> নতুন যোগ করুন
                  </button>
                </div>

                {!customer.addresses || customer.addresses.length === 0 ? (
                  <div className="address-empty-state">
                    <MapPin size={40} style={{ opacity: 0.3 }} />
                    <p style={{ fontWeight: 600, margin: 0 }}>আপনার কোনো ঠিকানা সংরক্ষিত নেই।</p>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>ভবিষ্যতে দ্রুত অর্ডার করতে এখানে আপনার ঠিকানাগুলো সংরক্ষণ করে রাখতে পারেন।</p>
                  </div>
                ) : (
                  <div className="address-grid">
                    {customer.addresses.map((addr) => (
                      <div key={addr.id} className={`address-card ${addr.isDefault ? 'default-address' : ''}`}>
                        <div>
                          <div className="address-card-header">
                            <span className="address-label">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="address-default-badge">
                                <CheckCircle2 size={12} /> ডিফল্ট
                              </span>
                            )}
                          </div>
                          
                          <div className="address-card-body" style={{ marginTop: '12px' }}>
                            <div className="address-user-name">{addr.name}</div>
                            <div className="address-user-phone">📞 {addr.phone}</div>
                            <div className="address-details">{addr.address}</div>
                          </div>
                        </div>

                        <div className="address-card-actions">
                          {!addr.isDefault && (
                            <button 
                              onClick={() => setDefaultCustomerAddress(addr.id)} 
                              className="address-action-btn set-default"
                              title="Set as Default"
                            >
                              ডিফল্ট করুন
                            </button>
                          )}
                          <button 
                            onClick={() => openEditAddressModal(addr)} 
                            className="address-action-btn"
                          >
                            <Edit size={12} /> এডিট
                          </button>
                          <button 
                            onClick={() => deleteCustomerAddress(addr.id)} 
                            className="address-action-btn delete"
                          >
                            <Trash2 size={12} /> ডিলিট
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* WISHLIST TAB */}
          {activeTab === 'wishlist' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>আমার উইশলিস্ট</h3>
              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sf-text-tertiary)' }}>
                  <Heart size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)' }}>আপনার উইশলিস্টটি খালি।</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {config.products
                    .filter((product: any) => wishlist.some((id: any) => String(id) === String(product.id)))
                    .map((product: any) => (
                      <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', border: '1px solid var(--sf-border)', borderRadius: '8px', background: 'var(--sf-bg-card)' }}>
                        <img src={product.image} alt={product.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div style={{ flexGrow: 1 }}>
                          <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'var(--sf-text-primary)', fontWeight: 700 }}>{product.name}</Link>
                          <div style={{ color: 'var(--sf-accent)', fontWeight: 800, marginTop: '4px' }}>৳{product.price}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => { addToCart(product); toggleWishlist(product.id); }} 
                            style={{ padding: '8px 12px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                          >
                            কার্টে যোগ করুন
                          </button>
                          <button 
                            onClick={() => toggleWishlist(product.id)} 
                            style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                          >
                            মুছুন
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* CART TAB */}
          {activeTab === 'cart' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>শপিং কার্ট</h3>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sf-text-tertiary)' }}>
                  <ShoppingCart size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)' }}>আপনার কার্টটি খালি।</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {cart.map((item: any) => (
                      <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', border: '1px solid var(--sf-border)', borderRadius: '8px', background: 'var(--sf-bg-card)' }}>
                        <img src={item.product.image} alt={item.product.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div style={{ flexGrow: 1 }}>
                          <Link to={`/product/${item.product.id}`} style={{ textDecoration: 'none', color: 'var(--sf-text-primary)', fontWeight: 700 }}>{item.product.name}</Link>
                          <div style={{ color: 'var(--sf-accent)', fontWeight: 800, marginTop: '4px' }}>৳{(item.product.price * item.quantity).toFixed(2)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--sf-border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <button onClick={() => updateQuantity(item.product.id, -1)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-text-primary)' }}>-</button>
                            <span style={{ padding: '0 8px', fontWeight: 600 }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, 1)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-text-primary)' }}>+</button>
                          </div>
                          <button 
                            onClick={() => updateQuantity(item.product.id, -item.quantity)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--sf-border)', marginTop: '20px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>মোট পরিমাণ: ৳{cartTotal.toFixed(2)}</div>
                    <Link to="/checkout" style={{ padding: '10px 24px', background: 'var(--sf-accent)', color: 'white', borderRadius: '6px', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
                      চেকআউট করুন
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div>
              {!selectedOrder ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>আমার অর্ডার ইতিহাস</h3>
                    <button onClick={loadCustomerOrders} disabled={loadingOrders} style={{ background: 'none', border: 'none', color: 'var(--sf-accent)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <RefreshCw size={14} className={loadingOrders ? 'animate-spin' : ''} /> রিফ্রেশ করুন
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>লোডিং হচ্ছে...</div>
                  ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sf-text-tertiary)' }}>
                      <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                      <p style={{ fontWeight: 600 }}>আপনার কোনো অর্ডার পাওয়া যায়নি।</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>অর্ডারের সময় যে ইমেইল/ফোন দিয়েছিলেন তা প্রোফাইলের সাথে ম্যাচ করতে হবে।</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {orders.map((order, idx) => {
                        const lowerSt = (order.status || '').toLowerCase().trim();
                        let badgeBg = '#fef3c7';
                        let badgeColor = '#92400e';
                        let badgeText = 'অপেক্ষমান';

                        if (lowerSt === 'delivered' || lowerSt === 'completed') {
                          badgeBg = '#d1fae5';
                          badgeColor = '#065f46';
                          badgeText = 'ডেলিভার্ড';
                        } else if (lowerSt === 'shipped' || lowerSt === 'shipping') {
                          badgeBg = '#dbeafe';
                          badgeColor = '#1e40af';
                          badgeText = 'কুরিয়ারে পাঠানো হয়েছে';
                        } else if (lowerSt === 'processing') {
                          badgeBg = '#e0f2fe';
                          badgeColor = '#0369a1';
                          badgeText = 'প্রসেসিং';
                        } else if (lowerSt === 'cancelled') {
                          badgeBg = '#fee2e2';
                          badgeColor = '#991b1b';
                          badgeText = 'বাতিল করা হয়েছে';
                        } else if (lowerSt === 'returned') {
                          badgeBg = '#f3e8ff';
                          badgeColor = '#6b21a8';
                          badgeText = 'রিটার্ন করা হয়েছে';
                        }

                        return (
                          <div key={idx} style={{ border: '1px solid var(--sf-border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--sf-shadow-sm)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--sf-text-primary)', fontSize: '0.95rem' }}>অর্ডার নং: #{order.id}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)', marginTop: '2px' }}>তারিখ: {new Date(order.date || order.created_at || Date.now()).toLocaleDateString()}</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginTop: '6px' }}>মূল্য: ৳{order.amount} ({order.items} টি প্রোডাক্ট)</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ 
                                padding: '6px 12px', 
                                borderRadius: '20px', 
                                fontSize: '0.78rem', 
                                fontWeight: 700,
                                background: badgeBg,
                                color: badgeColor
                              }}>
                                {badgeText}
                              </span>
                              <button onClick={() => setSelectedOrder(order)} className="store-btn" style={{ height: '36px', background: 'var(--sf-text-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                                অর্ডার ট্র্যাক করুন
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* ORDER TIMELINE DETAILS */
                (() => {
                  const currentActiveOrder = orders.find(o => String(o.id) === String(selectedOrder.id)) || selectedOrder;
                  const trackingData = getTrackingSteps(currentActiveOrder.status);
                  
                  return (
                    <div>
                      <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--sf-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
                        <ArrowLeft size={16} /> অর্ডারের তালিকায় ফিরে যান
                      </button>

                      <div style={{ border: '1px solid var(--sf-border)', borderRadius: '16px', padding: '24px', background: 'var(--sf-bg-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '16px', marginBottom: '24px' }}>
                          <div>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>অর্ডার ট্র্যাকিং বিবরণী</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--sf-text-tertiary)', marginTop: '4px' }}>অর্ডার নং: <strong>#{currentActiveOrder.id}</strong> | তারিখ: {new Date(currentActiveOrder.date || currentActiveOrder.created_at || Date.now()).toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--sf-text-tertiary)' }}>মোট মূল্য</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--sf-text-primary)', marginTop: '2px' }}>৳{currentActiveOrder.amount}</div>
                          </div>
                        </div>

                        {/* Special alert banner for Cancelled / Returned orders */}
                        {trackingData.isCancelled && (
                          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={20} /> এই অর্ডারটি বাতিল (Cancelled) করা হয়েছে।
                          </div>
                        )}
                        {trackingData.isReturned && (
                          <div style={{ background: '#f3e8ff', color: '#6b21a8', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RotateCcw size={20} /> এই অর্ডারটি রিটার্ন (Returned) করা হয়েছে।
                          </div>
                        )}

                        {/* Timeline Graph */}
                        <div style={{ position: 'relative', padding: '10px 0 20px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                          
                          {/* Timeline Vertical Progress bar background line */}
                          <div style={{ position: 'absolute', left: '30px', top: '15px', bottom: '45px', width: '3px', background: 'var(--sf-border)', zIndex: 1 }} />
                          
                          {/* Timeline Vertical Active bar line */}
                          <div style={{ 
                            position: 'absolute', 
                            left: '30px', 
                            top: '15px', 
                            height: `${(Math.max(0, trackingData.activeIndex) / 3) * 100}%`,
                            maxHeight: 'calc(100% - 60px)',
                            width: '3px', 
                            background: 'linear-gradient(to bottom, var(--sf-accent), var(--sf-success))', 
                            zIndex: 2,
                            transition: 'height 0.5s ease'
                          }} />

                          {trackingData.steps.map((step, idx) => {
                            const isDone = trackingData.activeIndex >= 0 && idx <= trackingData.activeIndex;
                            return (
                              <div key={idx} style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 5 }}>
                                <div style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  borderRadius: '50%', 
                                  background: isDone ? 'var(--sf-success)' : 'white', 
                                  border: `2px solid ${isDone ? 'var(--sf-success)' : 'var(--sf-border)'}`,
                                  color: isDone ? 'white' : 'var(--sf-text-tertiary)',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  boxShadow: '0 0 0 4px white',
                                  transition: 'all 0.3s'
                                }}>
                                  {isDone ? <CheckCircle2 size={14} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--sf-text-tertiary)' }} />}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isDone ? 'var(--sf-text-primary)' : 'var(--sf-text-tertiary)' }}>{step.label}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--sf-text-tertiary)', marginTop: '2px' }}>{step.desc}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '20px', marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)' }}>কুরিয়ার সার্ভিস</div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px', color: 'var(--sf-text-primary)' }}>
                              {currentActiveOrder.courier || 'Pathao Courier'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)' }}>ডেলিভারি ঠিকানা</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px', color: 'var(--sf-text-primary)' }}>
                              {currentActiveOrder.address || 'Dhaka, Bangladesh'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '480px' }}>
              <div style={{ borderBottom: '1px solid var(--sf-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>হেল্প ও কাস্টমার সাপোর্ট চ্যাট</h3>
                <span style={{ fontSize: '0.72rem', color: '#16a34a', background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Support Agent Online
                </span>
              </div>

              {/* Message scroll container */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sf-text-tertiary)', margin: 'auto' }}>
                    <MessageSquare size={48} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600 }}>আপনার কোনো মেসেজ নেই</p>
                    <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>অর্ডার বা কোনো পণ্য নিয়ে যেকোনো প্রশ্ন করতে নিচে মেসেজ পাঠান।</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isAdmin = msg.sender === 'admin';
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: isAdmin ? 'flex-start' : 'flex-end', 
                          width: '100%' 
                        }}
                      >
                        <div 
                          style={{ 
                            maxWidth: '75%', 
                            padding: '12px 16px', 
                            borderRadius: '16px', 
                            borderTopLeftRadius: isAdmin ? '2px' : '16px',
                            borderBottomRightRadius: isAdmin ? '16px' : '2px',
                            background: isAdmin ? '#f1f5f9' : 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', 
                            color: isAdmin ? 'var(--sf-text-primary)' : 'white',
                            boxShadow: 'var(--sf-shadow-sm)',
                            position: 'relative'
                          }}
                        >
                          {msg.message.startsWith('PRODUCT_SHARE:') ? (
                            (() => {
                              try {
                                const productInfo = JSON.parse(msg.message.substring(14));
                                return (
                                  <Link 
                                    to={`/product/${productInfo.id}`} 
                                    style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      gap: '8px', 
                                      textDecoration: 'none', 
                                      color: 'inherit',
                                      background: isAdmin ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.1)',
                                      borderRadius: '12px',
                                      padding: '10px',
                                      width: '200px',
                                      border: '1px solid var(--sf-border)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <img 
                                      src={productInfo.image} 
                                      alt={productInfo.name} 
                                      style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} 
                                    />
                                    <div style={{ fontWeight: 700, fontSize: '0.75rem', marginTop: '2px', color: isAdmin ? 'var(--sf-text-primary)' : 'white', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                      {productInfo.name}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isAdmin ? 'var(--sf-text-primary)' : 'white' }}>৳{productInfo.price}</span>
                                      <span style={{ fontSize: '9px', background: 'rgba(255, 255, 255, 0.2)', color: isAdmin ? 'var(--sf-text-primary)' : 'white', padding: '1px 5px', borderRadius: '4px' }}>প্রোডাক্ট লিংক</span>
                                    </div>
                                  </Link>
                                );
                              } catch (e) {
                                return <div style={{ fontSize: '0.88rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.message}</div>;
                              }
                            })()
                          ) : (
                            <div style={{ fontSize: '0.88rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                          )}
                          <div 
                            style={{ 
                              fontSize: '0.65rem', 
                              textAlign: 'right', 
                              marginTop: '6px', 
                              opacity: 0.6,
                              color: isAdmin ? 'var(--sf-text-tertiary)' : 'white'
                            }}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Editor */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--sf-border)', paddingTop: '16px' }}>
                <input 
                  type="text" 
                  value={inputMessage} 
                  onChange={e => setInputMessage(e.target.value)} 
                  placeholder="আপনার মেসেজটি এখানে লিখুন..." 
                  style={{ flex: 1, height: '44px', border: '1.5px solid var(--sf-border)', borderRadius: '12px', padding: '0 16px', outline: 'none', fontSize: '0.88rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                />
                <button type="submit" style={{ width: '44px', height: '44px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* ADDRESS MODAL */}
      {isAddressModalOpen && (
        <div className="address-modal-overlay" onClick={resetAddressForm}>
          <div className="address-modal" onClick={e => e.stopPropagation()}>
            <div className="address-modal-header">
              <h3 className="address-modal-title">
                {editingAddress ? 'সংরক্ষিত ঠিকানা এডিট করুন' : 'নতুন ডেলিভারি ঠিকানা যোগ করুন'}
              </h3>
              <button className="address-modal-close-btn" onClick={resetAddressForm}>
                <X size={18} />
              </button>
            </div>

            {addressError && (
              <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {addressError}
              </div>
            )}

            <form onSubmit={handleAddressSubmit} className="address-form">
              <div>
                <label className="address-form-label">ঠিকানার লেবেল (Label) <span>*</span></label>
                <input 
                  type="text" 
                  required 
                  value={addressLabel} 
                  onChange={e => setAddressLabel(e.target.value)} 
                  className="address-form-input" 
                  placeholder="যেমন: বাসা, অফিস, দোকান" 
                />
              </div>

              <div>
                <label className="address-form-label">কাস্টমারের নাম (Full Name) <span>*</span></label>
                <input 
                  type="text" 
                  required 
                  value={addressName} 
                  onChange={e => setAddressName(e.target.value)} 
                  className="address-form-input" 
                  placeholder="ডেলিভারি গ্রহীতার নাম" 
                />
              </div>

              <div>
                <label className="address-form-label">মোবাইল নম্বর (Phone Number) <span>*</span></label>
                <input 
                  type="tel" 
                  required 
                  value={addressPhone} 
                  onChange={e => setAddressPhone(e.target.value)} 
                  className="address-form-input" 
                  placeholder="যেমন: ০১৭XXXXXXXX" 
                />
              </div>

              <div>
                <label className="address-form-label">বিস্তারিত ঠিকানা (Detailed Address) <span>*</span></label>
                <textarea 
                  required 
                  value={addressDetail} 
                  onChange={e => setAddressDetail(e.target.value)} 
                  className="address-form-textarea" 
                  placeholder="বাসা/হোল্ডিং নং, রোড নং, এলাকা, থানা ও জেলা বিস্তারিত লিখুন"
                />
              </div>

              <div className="address-form-checkbox-row" onClick={() => setAddressIsDefault(!addressIsDefault)}>
                <input 
                  type="checkbox" 
                  checked={addressIsDefault} 
                  onChange={() => {}} 
                  className="address-form-checkbox" 
                />
                <span className="address-form-checkbox-label">এটি আমার ডিফল্ট ডেলিভারি ঠিকানা হিসেবে সেট করুন</span>
              </div>

              <div className="address-form-actions">
                <button type="button" onClick={resetAddressForm} className="address-btn-cancel">
                  বাতিল করুন
                </button>
                <button type="submit" className="address-btn-save">
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating 3D Chat Button & Popup */}
      {customer && (
        <>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '96px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)',
              color: 'white',
              border: 'none',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), inset 0 -4px 0 rgba(0, 0, 0, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            title="কাস্টমার চ্যাট সাপোর্ট"
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.5), inset 0 -4px 0 rgba(0, 0, 0, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.4), inset 0 -4px 0 rgba(0, 0, 0, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.3)';
            }}
          >
            <MessageSquare size={26} />
          </button>

          {isChatOpen && (
            <div 
              className="chat-popup-widget"
              style={{
                position: 'fixed',
                bottom: '96px',
                right: '24px',
                width: '380px',
                height: '520px',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                border: '1px solid var(--sf-border)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{ padding: '16px', background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                    {customer.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>কাস্টমার চ্যাট সাপোর্ট</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} /> Support Agent Online
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sf-text-tertiary)', margin: 'auto' }}>
                    <MessageSquare size={40} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)', fontSize: '0.85rem' }}>আপনার কোনো মেসেজ নেই</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>অর্ডার বা কোনো পণ্য নিয়ে যেকোনো প্রশ্ন করতে নিচে মেসেজ পাঠান।</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isAdmin = msg.sender === 'admin';
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: isAdmin ? 'flex-start' : 'flex-end', 
                          width: '100%' 
                        }}
                      >
                        <div 
                          style={{ 
                            maxWidth: '75%', 
                            padding: '10px 14px', 
                            borderRadius: '14px', 
                            borderTopLeftRadius: isAdmin ? '2px' : '14px',
                            borderBottomRightRadius: isAdmin ? '14px' : '2px',
                            background: isAdmin ? '#e2e8f0' : 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', 
                            color: isAdmin ? '#1e293b' : 'white',
                            boxShadow: 'var(--sf-shadow-sm)',
                            position: 'relative'
                          }}
                        >
                          {msg.message.startsWith('data:image/') ? (
                            <img 
                              src={msg.message} 
                              alt="Sent image" 
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} 
                            />
                          ) : msg.message.startsWith('PRODUCT_SHARE:') ? (
                            (() => {
                              try {
                                const productInfo = JSON.parse(msg.message.substring(14));
                                return (
                                  <Link 
                                    to={`/product/${productInfo.id}`} 
                                    style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      gap: '8px', 
                                      textDecoration: 'none', 
                                      color: 'inherit',
                                      background: isAdmin ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.1)',
                                      borderRadius: '12px',
                                      padding: '10px',
                                      width: '200px',
                                      border: '1px solid var(--sf-border)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <img 
                                      src={productInfo.image} 
                                      alt={productInfo.name} 
                                      style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} 
                                    />
                                    <div style={{ fontWeight: 700, fontSize: '0.75rem', marginTop: '2px', color: isAdmin ? 'var(--sf-text-primary)' : 'white', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                      {productInfo.name}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isAdmin ? 'var(--sf-text-primary)' : 'white' }}>৳{productInfo.price}</span>
                                      <span style={{ fontSize: '9px', background: 'rgba(255, 255, 255, 0.2)', color: isAdmin ? 'var(--sf-text-primary)' : 'white', padding: '1px 5px', borderRadius: '4px' }}>প্রোডাক্ট লিংক</span>
                                    </div>
                                  </Link>
                                );
                              } catch (e) {
                                return <div style={{ fontSize: '0.82rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.message}</div>;
                              }
                            })()
                          ) : (
                            <div style={{ fontSize: '0.82rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                          )}
                          <div 
                            style={{ 
                              fontSize: '0.6rem', 
                              textAlign: 'right', 
                              marginTop: '4px', 
                              opacity: 0.6,
                              color: isAdmin ? '#64748b' : 'white'
                            }}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Form with image upload button */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--sf-border)', padding: '12px 16px', background: 'white', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', border: '1.5px solid var(--sf-border)', cursor: 'pointer', color: 'var(--sf-text-secondary)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <Plus size={20} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
                <input 
                  type="text" 
                  value={inputMessage} 
                  onChange={e => setInputMessage(e.target.value)} 
                  placeholder="মেসেজ লিখুন..." 
                  style={{ flex: 1, height: '40px', border: '1.5px solid var(--sf-border)', borderRadius: '10px', padding: '0 12px', outline: 'none', fontSize: '0.85rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                />
                <button type="submit" style={{ width: '40px', height: '40px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
