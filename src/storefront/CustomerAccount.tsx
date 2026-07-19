import { useState, useEffect, useRef } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Calendar, ShoppingBag, MessageSquare, LogOut, 
  Lock, ArrowRight, ShieldCheck, MapPin, Truck, CheckCircle2, 
  Clock, AlertCircle, HelpCircle, Send, Plus, ArrowLeft, RefreshCw,
  Trash2, Edit, X, Heart, ShoppingCart, Ticket, Menu, RotateCcw, Trophy,
  FileText
} from 'lucide-react';
import { fetchOrdersFromBackend, fetchCustomerOrdersFromBackend, fetchChatHistory } from '../services/api';
import { convertToWebP } from '../utils/imageCdn';
import { getWebSocketUrl } from '../utils/storefrontUtils';
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
  memoNumber?: string;
  productsList?: { name: string; size: string; quantity: number; price: number }[];
  subtotal?: number;
  deliveryCharge?: number;
  discount?: number;
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
    googleLogin,
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
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'invoices' | 'coupons' | 'events' | 'addresses' | 'wishlist' | 'cart' | 'chat'>('profile');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderItem | null>(null);

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
  const [addressLabel, setAddressLabel] = useState('à¦¬à¦¾à¦¸à¦¾ (Home)');
  const [addressName, setAddressName] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressError, setAddressError] = useState('');

  const resetAddressForm = () => {
    setEditingAddress(null);
    setAddressLabel('à¦¬à¦¾à¦¸à¦¾ (Home)');
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
      setAddressError('à¦²à§‡à¦¬à§‡à¦² (à¦¯à§‡à¦®à¦¨: à¦¬à¦¾à¦¸à¦¾, à¦…à¦«à¦¿à¦¸) à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤');
      return;
    }
    if (!addressName.trim()) {
      setAddressError('à¦¨à¦¾à¦® à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤');
      return;
    }
    if (!addressPhone.trim()) {
      setAddressError('à¦®à§‹à¦¬à¦¾à¦‡à¦² à¦¨à¦®à§à¦¬à¦° à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤');
      return;
    }
    if (!addressDetail.trim()) {
      setAddressError('à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤');
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
      setAddressError('à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à¦¤à§‡ à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à§Ÿà§‡à¦›à§‡à¥¤');
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

  // Load Google Client SDK Script and Render Login Button
  useEffect(() => {
    if (!customer) {
      // 1. Dynamic Script Loader
      const scriptId = 'google-gsi-client-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }

      // 2. Initialize and render button when script and DOM container are ready
      const initGoogle = () => {
        if ((window as any).google && document.getElementById('google-signin-btn')) {
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
          
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              setAuthError('');
              setAuthSuccess('');
              if (response.credential) {
                const res = await googleLogin(response.credential);
                if (res.success) {
                  setAuthSuccess('à¦—à§à¦—à¦² à¦¦à¦¿à§Ÿà§‡ à¦²à¦—à¦‡à¦¨ à¦¸à¦«à¦² à¦¹à§Ÿà§‡à¦›à§‡!');
                } else {
                  setAuthError(res.error || 'à¦—à§à¦—à¦² à¦²à¦—à¦‡à¦¨ à¦¬à§à¦¯à¦°à§à¦¥ à¦¹à§Ÿà§‡à¦›à§‡à¥¤');
                }
              } else {
                setAuthError('à¦—à§à¦—à¦² à¦¥à§‡à¦•à§‡ à¦•à§‹à¦¨à§‹ à¦­à§à¦¯à¦¾à¦²à¦¿à¦¡ à¦•à§à¦°à§‡à¦¡à§‡à¦¨à¦¶à¦¿à§Ÿà¦¾à¦² à¦ªà¦¾à¦“à§Ÿà¦¾ à¦¯à¦¾à§Ÿà¦¨à¦¿à¥¤');
              }
            },
          });

          (window as any).google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: 'outline', size: 'large', width: 396 }
          );
        }
      };

      // Poll check every 300ms until window.google is loaded
      const pollTimer = setInterval(() => {
        if ((window as any).google && document.getElementById('google-signin-btn')) {
          initGoogle();
          clearInterval(pollTimer);
        }
      }, 300);

      return () => {
        clearInterval(pollTimer);
      };
    }
  }, [customer, isRegister]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!customer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64String = await convertToWebP(file);
      
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
    } catch (err) {
      alert('à¦‡à¦®à§‡à¦œ à¦°à§‚à¦ªà¦¾à¦¨à§à¦¤à¦° à¦•à¦°à¦¤à§‡ à¦¬à§à¦¯à¦°à§à¦¥ à¦¹à§Ÿà§‡à¦›à§‡à¥¤');
    }
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileName.trim()) {
      setProfileError('à¦¨à¦¾à¦® à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤');
      return;
    }
    if (!profilePhone.trim()) {
      setProfileError('à¦®à§‹à¦¬à¦¾à¦‡à¦² à¦¨à¦®à§à¦¬à¦° à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤');
      return;
    }

    try {
      updateCustomerProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        address: profileAddress.trim()
      });
      setProfileSuccess('à¦†à¦ªà¦¨à¦¾à¦° à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦¤à¦¥à§à¦¯ à¦¸à¦«à¦²à¦­à¦¾à¦¬à§‡ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡!');
    } catch (err) {
      setProfileError('à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à§Ÿà§‡à¦›à§‡à¥¤');
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

      // Helper matcher function
      const isOrderForCustomer = (o: any) => {
        if (!o) return false;
        const oEmail = (o.email || '').toLowerCase().trim();
        const oPhone = (o.phone || '').replace(/[^0-9]/g, '');

        const emailMatch = Boolean(custEmail && oEmail && oEmail === custEmail);
        const phoneMatch = Boolean(custPhone && custPhone.length >= 6 && oPhone && (
          oPhone === custPhone ||
          (oPhone.length >= 10 && custPhone.endsWith(oPhone.slice(-10))) ||
          (custPhone.length >= 10 && oPhone.endsWith(custPhone.slice(-10)))
        ));

        return emailMatch || phoneMatch;
      };

      // 1. Fetch directly from backend (real database - highest priority)
      const backendCustomerOrders = await fetchCustomerOrdersFromBackend(customer.email, customer.phone);
      const generalOrders = await fetchOrdersFromBackend();

      // Combine and deduplicate backend results by order id
      const matchedMap = new Map<string, any>();

      // Process general orders first (lower priority)
      (generalOrders || []).forEach((o: any) => {
        if (o && o.id && isOrderForCustomer(o)) {
          matchedMap.set(String(o.id), o);
        }
      });

      // Process customer-specific orders (higher priority â€” overwrites with fresher data)
      (backendCustomerOrders || []).forEach((o: any) => {
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

      // If backend returned results, use them directly (no localStorage/mock mixing)
      if (matchedMap.size > 0) {
        const finalOrders = Array.from(matchedMap.values()).sort((a: any, b: any) => {
          const dateA = new Date(a.date || a.created_at || 0).getTime();
          const dateB = new Date(b.date || b.created_at || 0).getTime();
          return dateB - dateA;
        });
        localStorage.setItem(cacheKey, JSON.stringify(finalOrders));
        setOrders(finalOrders as any[]);
        return;
      }

      // 2. Fallback: backend returned nothing â€” try localStorage cache (no mock data)
      let cachedOrders: any[] = [];
      try {
        const storedCache = localStorage.getItem(cacheKey);
        if (storedCache) cachedOrders = JSON.parse(storedCache);
      } catch (e) {}

      let localOrderList: any[] = [];
      try {
        const storedOrderList = localStorage.getItem('orderList');
        if (storedOrderList) localOrderList = JSON.parse(storedOrderList);
      } catch (e) {}

      const fallbackMap = new Map<string, any>();
      [...cachedOrders, ...localOrderList].forEach((o: any) => {
        if (o && o.id && isOrderForCustomer(o)) {
          const existing = fallbackMap.get(String(o.id)) || {};
          fallbackMap.set(String(o.id), { ...existing, ...o });
        }
      });

      const fallbackOrders = Array.from(fallbackMap.values()).sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.created_at || 0).getTime();
        const dateB = new Date(b.date || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setOrders(fallbackOrders as any[]);
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
        const wsUrl = getWebSocketUrl();

        try {
          const ws = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen = () => {
            console.log('âš¡ Storefront support chat WebSocket connection open.');
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
        setAuthError('à¦¦à§Ÿà¦¾ à¦•à¦°à§‡ à¦¸à¦¬à¦—à§ à¦²à§‹ à¦˜à¦° à¦ªà§‚à¦°à¦£ à¦•à¦°à§ à¦¨à¥¤');
        return;
      }
      const res = await register(authName, authEmail, authPassword, authPhone);
      if (!res.success) {
        setAuthError(res.error || 'à¦¨à¦¿à¦¬à¦¨à§ à¦§à¦¨ à¦¬à§ à¦¯à¦°à§ à¦¥ à¦¹à§Ÿà§‡à¦›à§‡à¥¤');
      } else {
        setAuthSuccess('à¦…à§ à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§ à¦Ÿ à¦¤à§ˆà¦°à¦¿ à¦¸à¦«à¦² à¦¹à§Ÿà§‡à¦›à§‡!');
      }
    } else {
      if (!authEmail || !authPassword) {
        setAuthError('à¦‡à¦®à§‡à¦‡à¦² à¦“ à¦ªà¦¾à¦¸à¦“à§Ÿà¦¾à¦°à§ à¦¡ à¦ªà§ à¦°à¦¦à¦¾à¦¨ à¦•à¦°à§ à¦¨à¥¤');
        return;
      }
      const res = await login(authEmail, authPassword);
      if (!res.success) {
        setAuthError(res.error || 'à¦²à¦—à¦‡à¦¨ à¦¬à§ à¦¯à¦°à§ à¦¥ à¦¹à§Ÿà§‡à¦›à§‡à¥¤');
      }
    }
  };



  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !inputMessage.trim()) return;

    const msgText = inputMessage.trim();
    setInputMessage('');

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      customerId: customer.id,
      customerName: customer.name,
      sender: 'customer',
      message: msgText,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Optimistically update UI
    const storedChats = localStorage.getItem('storefront_chats');
    let allChats: ChatMessage[] = [];
    try { allChats = storedChats ? JSON.parse(storedChats) : []; } catch (e) {}
    syncChatData([...allChats, newMessage]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // WebSocket connected — send through WS (backend saves to DB and broadcasts)
      socketRef.current.send(JSON.stringify({
        type: 'message',
        customerId: customer.id,
        customerName: customer.name,
        sender: 'customer',
        message: msgText
      }));
    } else {
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
              message: `à¦§à¦¨à§à¦¯à¦¬à¦¾à¦¦ ${customer.name}! à¦†à¦®à¦°à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦®à§‡à¦¸à§‡à¦œà¦Ÿà¦¿ à¦ªà§‡à§Ÿà§‡à¦›à¦¿à¥¤ à¦†à¦®à¦¾à¦¦à§‡à¦° à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦° à¦ªà§à¦°à¦¤à¦¿à¦¨à¦¿à¦§à¦¿ à¦¶à§€à¦˜à§à¦°à¦‡ à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦•à¦°à¦¬à§‡à¥¤`,
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
      { key: 'placed', label: 'à¦…à¦°à§à¦¡à¦¾à¦° à¦ªà§à¦²à§‡à¦¸à¦¡', desc: 'à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¸à¦«à¦²à¦­à¦¾à¦¬à§‡ à¦—à§à¦°à¦¹à¦£ à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡', icon: Clock },
      { key: 'processing', label: 'à¦ªà§à¦°à¦¸à§‡à¦¸à¦¿à¦‚', desc: 'à¦ªà§à¦¯à¦¾à¦•à§‡à¦œà¦¿à¦‚ à¦“ à¦­à§‡à¦°à¦¿à¦«à¦¿à¦•à§‡à¦¶à¦¨ à¦šà¦²à¦›à§‡', icon: RefreshCw },
      { key: 'shipped', label: 'à¦•à§à¦°à¦¿à§Ÿà¦¾à¦°à§‡ à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦¹à§Ÿà§‡à¦›à§‡', desc: 'à¦ªà¦£à§à¦¯à¦Ÿà¦¿ à¦•à§à¦°à¦¿à§Ÿà¦¾à¦°à§‡ à¦¹à¦¸à§à¦¤à¦¾à¦¨à§à¦¤à¦° à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡', icon: Truck },
      { key: 'delivered', label: 'à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à§à¦¡', desc: 'à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¾à¦›à§‡ à¦ªà§Œà¦à¦›à§‡ à¦—à§‡à¦›à§‡', icon: CheckCircle2 }
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
              {isRegister ? 'à¦¨à¦¤à§à¦¨ à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨' : 'à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦° à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿà§‡ à¦²à¦—à¦‡à¦¨'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-tertiary)', marginTop: '4px' }}>
              {isRegister ? 'à¦¸à¦¹à¦œ à¦Ÿà§à¦°à§à¦¯à¦¾à¦•à¦¿à¦‚ à¦“ à¦šà§à¦¯à¦¾à¦Ÿ à¦¸à¦¾à¦ªà§‹à¦°à§à¦Ÿ à¦ªà§‡à¦¤à§‡ à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨' : 'à¦…à¦°à§à¦¡à¦¾à¦° à¦Ÿà§à¦°à§à¦¯à¦¾à¦• à¦à¦¬à¦‚ à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦° à¦¸à¦¾à¦ªà§‹à¦°à§à¦Ÿà§‡ à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦•à¦°à¦¤à§‡ à¦²à¦—à¦‡à¦¨ à¦•à¦°à§à¦¨'}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦†à¦ªà¦¨à¦¾à¦° à¦¨à¦¾à¦® *</label>
                  <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="à¦¯à§‡à¦®à¦¨: à¦®à§‹: à¦°à¦¹à¦¿à¦®" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦®à§‹à¦¬à¦¾à¦‡à¦² à¦¨à¦®à§à¦¬à¦° *</label>
                  <input type="tel" required value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="à¦¯à§‡à¦®à¦¨: à§¦à§§à§­XXXXXXXX" />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦‡à¦®à§‡à¦‡à¦² à¦ à¦¿à¦•à¦¾à¦¨à¦¾ *</label>
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="à¦¯à§‡à¦®à¦¨: example@gmail.com" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦ªà¦¾à¦¸à¦“à§Ÿà¦¾à¦°à§à¦¡ *</label>
              <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }} placeholder="à¦ªà¦¾à¦¸à¦“à§Ÿà¦¾à¦°à§à¦¡ à¦¦à¦¿à¦¨" />
            </div>

            <button type="submit" style={{ width: '100%', height: '44px', background: 'var(--sf-text-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
              {isRegister ? 'à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨' : 'à¦²à¦—à¦‡à¦¨ à¦•à¦°à§à¦¨'} <ArrowRight size={16} />
            </button>
          </form>

          {/* OR Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--sf-border)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)', fontWeight: 600 }}>à¦…à¦¥à¦¬à¦¾</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--sf-border)' }} />
          </div>

          {/* Google Sign-In Button Container */}
          <div 
            id="google-signin-btn" 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              width: '100%', 
              minHeight: '44px',
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--sf-text-secondary)' }}>
            {isRegister ? (
              <>
                à¦…à¦²à¦°à§‡à¦¡à¦¿ à¦à¦•à¦Ÿà¦¿ à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦†à¦›à§‡?{' '}
                <button onClick={() => { setIsRegister(false); setAuthError(''); }} style={{ background: 'none', border: 'none', color: 'var(--sf-accent)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  à¦²à¦—à¦‡à¦¨ à¦•à¦°à§à¦¨
                </button>
              </>
            ) : (
              <>
                à¦•à§‹à¦¨à§‹ à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦¨à§‡à¦‡?{' '}
                <button onClick={() => { setIsRegister(true); setAuthError(''); }} style={{ background: 'none', border: 'none', color: 'var(--sf-accent)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨
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
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦° à¦ªà§‹à¦°à§à¦Ÿà¦¾à¦²</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--sf-text-tertiary)' }}>à¦¸à§à¦¬à¦¾à¦—à¦¤à¦®, {customer.name}!</p>
        </div>
        <button onClick={logout} className="store-btn" style={{ height: '40px', background: 'white', border: '1.5px solid var(--sf-border)', color: '#ef4444', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', padding: '0 16px' }}>
          <LogOut size={16} /> à¦²à¦—à¦†à¦‰à¦Ÿ à¦•à¦°à§à¦¨
        </button>
      </div>

      {/* Mobile Drawer Toggle Bar */}
      <div className="account-mobile-bar">
        <button 
          onClick={() => setIsMobileDrawerOpen(true)}
          className="account-drawer-toggle-btn"
        >
          <Menu size={18} />
          <span>à¦à¦•à¦¾à¦‰à¦¨à§à¦Ÿ à¦®à§‡à¦¨à§ (Account Menu)</span>
        </button>

        <button 
          onClick={() => setIsChatOpen(true)}
          className="account-mobile-chat-trigger-btn"
        >
          <MessageSquare size={16} />
          <span>à¦²à¦¾à¦‡à¦­ à¦šà§à¦¯à¦¾à¦Ÿ</span>
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
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', overflow: 'hidden' }}>
                {customer.avatar && customer.avatar.startsWith('http') ? (
                  <img src={customer.avatar} alt={customer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  customer.avatar || 'C'
                )}
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
            <User size={18} /> à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦¤à¦¥à§à¦¯ (Profile)
          </button>
          
          <button 
            onClick={() => { setActiveTab('orders'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'orders' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'orders' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <ShoppingBag size={18} /> à¦†à¦®à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦°à¦¸à¦®à§‚à¦¹ ({orders.length})
          </button>
          
          <button 
            onClick={() => { setActiveTab('invoices'); setSelectedOrder(null); setSelectedInvoice(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'invoices' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'invoices' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <FileText size={18} /> à¦†à¦®à¦¾à¦° à¦‡à¦¨à¦­à§Ÿà§‡à¦¸à¦¸à¦®à§‚à¦¹ (Invoices)
          </button>
          
          <button 
            onClick={() => { setActiveTab('events'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'events' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'events' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Trophy size={18} style={{ color: '#fbbf24' }} /> à¦‡à¦­à§‡à¦¨à§à¦Ÿà¦¸à¦®à§‚à¦¹ (Events)
          </button>

          <button 
            onClick={() => { setActiveTab('coupons'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'coupons' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'coupons' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Ticket size={18} /> à¦†à¦®à¦¾à¦° à¦•à§à¦ªà¦¨ à¦“ à¦…à¦«à¦¾à¦°à¦¸à¦®à§‚à¦¹
          </button>

          <button 
            onClick={() => { setActiveTab('addresses'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'addresses' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'addresses' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <MapPin size={18} /> à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ ({customer.addresses?.length || 0})
          </button>
          
          <button 
            onClick={() => { setActiveTab('wishlist'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'wishlist' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'wishlist' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Heart size={18} /> à¦†à¦®à¦¾à¦° à¦‰à¦‡à¦¶à¦²à¦¿à¦¸à§à¦Ÿ ({wishlist.length})
          </button>
          
          <button 
            onClick={() => { setActiveTab('cart'); setSelectedOrder(null); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '12px 16px', background: activeTab === 'cart' ? 'var(--sf-bg-light)' : 'none', color: activeTab === 'cart' ? 'var(--sf-accent)' : 'var(--sf-text-secondary)', border: 'none', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <ShoppingCart size={18} /> à¦¶à¦ªà¦¿à¦‚ à¦•à¦¾à¦°à§à¦Ÿ ({cart.reduce((s: number, i: any) => s + i.quantity, 0)})
          </button>

          {/* Divider */}
          <div style={{ margin: '12px 0', borderTop: '1px solid var(--sf-border)' }} />

          {/* Support Box */}
          <div style={{ padding: '10px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)', border: '1px dashed var(--sf-accent)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sf-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦° à¦¸à¦¾à¦ªà§‹à¦°à§à¦Ÿ</div>
            <button 
              onClick={() => { setIsChatOpen(true); setIsMobileDrawerOpen(false); }}
              style={{ width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', color: 'white', border: 'none', borderRadius: '6px', textAlign: 'left', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
            >
              <MessageSquare size={16} /> 24/7 à¦²à¦¾à¦‡à¦­ à¦šà§à¦¯à¦¾à¦Ÿ à¦¸à¦¾à¦¹à¦¾à¦¯à§à¦¯
            </button>
          </div>

          {/* Logout Action */}
          <button 
            onClick={() => { logout(); navigate('/'); setIsMobileDrawerOpen(false); }}
            style={{ width: '100%', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}
          >
            <LogOut size={16} /> à¦²à¦—à¦†à¦‰à¦Ÿ à¦•à¦°à§à¦¨ (Logout)
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
                  <MapPin size={20} style={{ color: 'var(--sf-accent)' }} /> à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ (Saved Address Book)
                </h3>
                <button 
                  onClick={openAddAddressModal} 
                  className="address-action-btn set-default"
                  style={{ width: 'auto', padding: '0 16px', height: '38px', borderRadius: '8px' }}
                >
                  <Plus size={16} /> à¦¨à¦¤à§à¦¨ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¯à§‹à¦— à¦•à¦°à§à¦¨
                </button>
              </div>

              {!customer.addresses || customer.addresses.length === 0 ? (
                <div className="address-empty-state">
                  <MapPin size={48} style={{ opacity: 0.3, color: 'var(--sf-accent)' }} />
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '12px 0 4px 0' }}>à¦†à¦ªà¦¨à¦¾à¦° à¦•à§‹à¦¨à§‹ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¨à§‡à¦‡</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-secondary)', margin: 0 }}>à¦­à¦¬à¦¿à¦·à§à¦¯à¦¤à§‡ à§§-à¦•à§à¦²à¦¿à¦•à§‡ à¦¦à§à¦°à§à¦¤ à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦°à¦¾à¦° à¦œà¦¨à§à¦¯ à¦à¦–à¦¾à¦¨à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦¬à¦¾à¦¸à¦¾ à¦¬à¦¾ à¦…à¦«à¦¿à¦¸à§‡à¦° à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à§à¦¨à¥¤</p>
                  <button 
                    onClick={openAddAddressModal}
                    style={{ marginTop: '16px', padding: '10px 20px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¯à§‹à¦— à¦•à¦°à§à¦¨
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
                              <CheckCircle2 size={12} /> à¦¡à¦¿à¦«à¦²à§à¦Ÿ
                            </span>
                          )}
                        </div>
                        
                        <div className="address-card-body" style={{ marginTop: '12px' }}>
                          <div className="address-user-name">{addr.name}</div>
                          <div className="address-user-phone">ðŸ“ž {addr.phone}</div>
                          <div className="address-details">{addr.address}</div>
                        </div>
                      </div>

                      <div className="address-card-actions">
                        {!addr.isDefault && (
                          <button 
                            onClick={() => setDefaultCustomerAddress(addr.id)} 
                            className="address-action-btn set-default"
                          >
                            à¦¡à¦¿à¦«à¦²à§à¦Ÿ à¦•à¦°à§à¦¨
                          </button>
                        )}
                        <button 
                          onClick={() => openEditAddressModal(addr)} 
                          className="address-action-btn"
                        >
                          <Edit size={12} /> à¦à¦¡à¦¿à¦Ÿ
                        </button>
                        <button 
                          onClick={() => deleteCustomerAddress(addr.id)} 
                          className="address-action-btn" 
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={12} /> à¦¡à¦¿à¦²à¦¿à¦Ÿ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>à¦†à¦®à¦¾à¦° à¦‡à¦¨à¦­à§Ÿà§‡à¦¸à¦¸à¦®à§‚à¦¹ (Invoice History)</h3>
              
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sf-text-tertiary)' }}>
                  <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)' }}>à¦†à¦ªà¦¨à¦¾à¦° à¦•à§‹à¦¨à§‹ à¦‡à¦¨à¦­à§Ÿà§‡à¦¸ à¦¨à§‡à¦‡à¥¤</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {orders.map((order) => {
                    const isSelected = selectedInvoice?.id === order.id;
                    return (
                      <div 
                        key={order.id} 
                        style={{ 
                          border: '1px solid var(--sf-border)', 
                          borderRadius: '8px', 
                          background: 'var(--sf-bg-card)',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Invoice row header summary */}
                        <div 
                          onClick={() => setSelectedInvoice(isSelected ? null : order)}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '16px', 
                            cursor: 'pointer',
                            background: isSelected ? 'var(--sf-bg-light)' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--sf-text-primary)' }}>
                              à¦‡à¦¨à¦­à§Ÿà§‡à¦¸ #{(order.memoNumber || '').includes('TrxID:') ? `GS-${order.id}` : `GS-${order.id}`}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)', marginTop: '4px' }}>
                              à¦¤à¦¾à¦°à¦¿à¦–: {new Date(order.date || order.created_at || Date.now()).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--sf-accent)' }}>à§³{order.amount}</div>
                              <span style={{ 
                                fontSize: '10px', 
                                background: order.status === 'delivered' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)', 
                                color: order.status === 'delivered' ? 'var(--sf-success)' : 'var(--sf-warning)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {order.status === 'delivered' ? 'à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à§à¦¡' : order.status === 'processing' ? 'à¦ªà§à¦°à¦¸à§‡à¦¸à¦¿à¦‚' : 'à¦ªà§‡à¦¨à§à¦¡à¦¿à¦‚'}
                              </span>
                            </div>
                            <button 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--sf-accent)', 
                                fontWeight: 700, 
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              {isSelected ? 'à¦¬à¦¨à§à¦§ à¦•à¦°à§à¦¨' : 'à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ à¦¦à§‡à¦–à§à¦¨'}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible printable invoice view */}
                        {isSelected && (
                          <div style={{ borderTop: '1px solid var(--sf-border)', padding: '24px', background: 'white' }}>
                            <div className="printable-invoice" style={{ background: 'white', color: 'black' }}>
                              <div className="invoice-header">
                                <div>
                                  <h1 className="invoice-title">{config.branding.storeName || 'Gazi Sports'}</h1>
                                  <span style={{ fontSize: '0.78rem', color: '#4f566b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Play Hard, Shop Smart</span>
                                </div>
                                <div className="invoice-meta">
                                  <div><b>à¦®à§‡à¦®à§‹ à¦¨à¦‚:</b> {order.memoNumber ? order.memoNumber : `GS-${order.id}`}</div>
                                  <div><b>à¦¤à¦¾à¦°à¦¿à¦–:</b> {new Date(order.date || order.created_at || Date.now()).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                  <div><b>à¦ªà§‡à¦®à§‡à¦¨à§à¦Ÿ:</b> {order.paymentMethod || 'à¦•à§à¦¯à¦¾à¦¶ à¦…à¦¨ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿'}</div>
                                </div>
                              </div>

                              <div className="invoice-parties">
                                <div>
                                  <div className="invoice-party-title">à¦ªà§à¦°à§‡à¦°à¦• (Sender)</div>
                                  <div className="invoice-party-details">
                                    <b>{config.branding.storeName || 'Gazi Sports'}</b><br />
                                    à¦®à§‹à¦¬à¦¾à¦‡à¦²: {config.contactInfo.phoneNumber || '01700000000'}<br />
                                    à¦‡à¦®à§‡à¦‡à¦²: {config.contactInfo.email || 'support@gazisports.com'}<br />
                                    à¦ à¦¿à¦•à¦¾à¦¨à¦¾: à¦¢à¦¾à¦•à¦¾, à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶
                                  </div>
                                </div>
                                <div>
                                  <div className="invoice-party-title">à¦¬à¦¿à¦²à¦¿à¦‚ à¦“ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾</div>
                                  <div className="invoice-party-details">
                                    <b>à¦¨à¦¾à¦®:</b> {order.customer || customer.name}<br />
                                    <b>à¦®à§‹à¦¬à¦¾à¦‡à¦²:</b> {order.phone || customer.phone}<br />
                                    <b>à¦ à¦¿à¦•à¦¾à¦¨à¦¾:</b> {order.address || customer.address}
                                  </div>
                                </div>
                              </div>

                              <div className="invoice-table-wrapper">
                                <table className="invoice-table">
                                  <thead>
                                    <tr>
                                      <th>à¦ªà¦£à§à¦¯ à¦¬à¦¿à¦¬à¦°à¦£ (Product)</th>
                                      <th style={{ textAlign: 'center' }}>à¦¸à¦¾à¦‡à¦œ (Size)</th>
                                      <th style={{ textAlign: 'center' }}>à¦ªà¦°à¦¿à¦®à¦¾à¦£ (Qty)</th>
                                      <th style={{ textAlign: 'right' }}>à¦®à§‚à¦²à§à¦¯ (Price)</th>
                                      <th style={{ textAlign: 'right' }}>à¦®à§‹à¦Ÿ (Total)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.productsList ? (
                                      order.productsList.map((item: any, itemIdx: number) => (
                                        <tr key={itemIdx}>
                                          <td>{item.name}</td>
                                          <td style={{ textAlign: 'center' }}>{item.size || 'Free Size'}</td>
                                          <td style={{ textAlign: 'center' }}>{item.quantity || 1}à¦Ÿà¦¿</td>
                                          <td style={{ textAlign: 'right' }}>à§³{(item.price || order.amount).toFixed(2)}</td>
                                          <td style={{ textAlign: 'right' }}>à§³{((item.price || order.amount) * (item.quantity || 1)).toFixed(2)}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td>à¦ªà¦£à§à¦¯ à¦¬à¦¿à¦¬à¦°à¦£ (à¦…à¦°à§à¦¡à¦¾à¦° #{order.id})</td>
                                        <td style={{ textAlign: 'center' }}>à¦«à§à¦°à¦¿ à¦¸à¦¾à¦‡à¦œ</td>
                                        <td style={{ textAlign: 'center' }}>à§§à¦Ÿà¦¿</td>
                                        <td style={{ textAlign: 'right' }}>à§³{order.amount.toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>à§³{order.amount.toFixed(2)}</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              <div className="invoice-totals">
                                <div className="invoice-total-row">
                                  <span>à¦‰à¦ªà¦®à§‹à¦Ÿ (Subtotal)</span>
                                  <span>à§³{(order.subtotal || order.amount - (order.deliveryCharge || 0) + (order.discount || 0)).toFixed(2)}</span>
                                </div>
                                <div className="invoice-total-row">
                                  <span>à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦šà¦¾à¦°à§à¦œ</span>
                                  <span>à§³{(order.deliveryCharge || 0).toFixed(2)}</span>
                                </div>
                                {(order.discount || 0) > 0 && (
                                  <div className="invoice-total-row" style={{ color: '#ef4444' }}>
                                    <span>à¦¡à¦¿à¦¸à¦•à¦¾à¦‰à¦¨à§à¦Ÿ</span>
                                    <span>-à§³{(order.discount || 0).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="invoice-total-row grand-total">
                                  <span>à¦¸à¦°à§à¦¬à¦®à§‹à¦Ÿ (Total Paid)</span>
                                  <span>à§³{order.amount.toFixed(2)}</span>
                                </div>
                              </div>

                              <div className="invoice-footer">
                                <p>à¦†à¦®à¦¾à¦¦à§‡à¦° à¦“à¦ªà¦° à¦†à¦¸à§à¦¥à¦¾ à¦°à¦¾à¦–à¦¾à¦° à¦œà¦¨à§à¦¯ à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦§à¦¨à§à¦¯à¦¬à¦¾à¦¦!</p>
                                <p style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>à¦à¦Ÿà¦¿ à¦à¦•à¦Ÿà¦¿ à¦•à¦®à§à¦ªà¦¿à¦‰à¦Ÿà¦¾à¦° à¦œà§‡à¦¨à¦¾à¦°à§‡à¦Ÿà§‡à¦¡ à¦šà¦¾à¦²à¦¾à¦¨ (Invoice), à¦•à§‹à¦¨à§‹ à¦¸à§à¦¬à¦¾à¦•à§à¦·à¦°à§‡à¦° à¦ªà§à¦°à§Ÿà§‹à¦œà¦¨ à¦¨à§‡à¦‡à¥¤</p>
                              </div>
                            </div>

                            {/* Print Action for selected invoice */}
                            <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--sf-border)', paddingTop: '16px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => window.print()} 
                                style={{ padding: '0 24px', height: '40px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                              >
                                à¦‡à¦¨à¦­à§Ÿà§‡à¦¸ à¦ªà§à¦°à¦¿à¦¨à§à¦Ÿ / à¦¸à§‡à¦­ à¦•à¦°à§à¦¨
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦¬à¦¿à¦¬à¦°à¦£à§€</h3>
              
              <div className="profile-badge-row">
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sf-accent) 0%, var(--sf-accent-hover) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: 'white', overflow: 'hidden' }}>
                  {customer.avatar && customer.avatar.startsWith('http') ? (
                    <img src={customer.avatar} alt={customer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    customer.avatar || 'C'
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sf-text-primary)' }}>{customer.name}</h4>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'var(--sf-bg-light)', color: 'var(--sf-accent)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Verified Customer
                    </span>
                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--sf-success)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px' }}>
                      à¦¸à¦¦à¦¸à§à¦¯à¦ªà¦¦: {new Date(customer.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })}
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
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦ªà§‚à¦°à§à¦£ à¦¨à¦¾à¦® *</label>
                    <input 
                      type="text" 
                      required 
                      value={profileName} 
                      onChange={e => setProfileName(e.target.value)} 
                      style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', background: 'var(--sf-bg-light)', color: 'var(--sf-text-primary)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦‡à¦®à§‡à¦‡à¦² (à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à¦¨à¦¯à§‹à¦—à§à¦¯ à¦¨à§Ÿ)</label>
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
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦®à§‹à¦¬à¦¾à¦‡à¦² à¦¨à¦®à§à¦¬à¦° *</label>
                    <input 
                      type="tel" 
                      required 
                      value={profilePhone} 
                      onChange={e => setProfilePhone(e.target.value)} 
                      style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', background: 'var(--sf-bg-light)', color: 'var(--sf-text-primary)' }} 
                      placeholder="à¦¯à§‡à¦®à¦¨: à§¦à§§à§­XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦°à§‡à¦œà¦¿à¦¸à§à¦Ÿà§à¦°à§‡à¦¶à¦¨ à¦¤à¦¾à¦°à¦¿à¦–</label>
                    <input 
                      type="text" 
                      disabled 
                      value={new Date(customer.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })} 
                      style={{ width: '100%', height: '42px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '0 12px', outline: 'none', background: '#e2e8f0', color: 'var(--sf-text-secondary)', cursor: 'not-allowed' }} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginBottom: '6px' }}>à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾</label>
                  <textarea 
                    value={profileAddress} 
                    onChange={e => setProfileAddress(e.target.value)} 
                    style={{ width: '100%', minHeight: '80px', border: '1px solid var(--sf-border)', borderRadius: '8px', padding: '10px 12px', outline: 'none', background: 'var(--sf-bg-light)', color: 'var(--sf-text-primary)', resize: 'vertical', fontFamily: 'inherit' }} 
                    placeholder="à¦¬à¦¾à¦¸à¦¾/à¦¹à§‹à¦²à§à¦¡à¦¿à¦‚ à¦¨à¦‚, à¦°à§‹à¦¡ à¦¨à¦‚, à¦à¦²à¦¾à¦•à¦¾, à¦¥à¦¾à¦¨à¦¾ à¦“ à¦œà§‡à¦²à¦¾ à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ à¦²à¦¿à¦–à§à¦¨"
                  />
                </div>

                <button 
                  type="submit" 
                  style={{ height: '44px', background: 'var(--sf-text-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 24px', alignSelf: 'flex-start', transition: 'background 0.2s' }}
                >
                  à¦¤à¦¥à§à¦¯ à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à§à¦¨ (Save Profile)
                </button>
              </form>

              {/* SAVED ADDRESSES SECTION */}
              <div className="addresses-section">
                <div className="addresses-section-header">
                  <h4 className="addresses-section-title">
                    <MapPin size={18} /> à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ (Saved Addresses)
                  </h4>
                  <button 
                    onClick={openAddAddressModal} 
                    className="address-action-btn set-default"
                    style={{ width: 'auto', padding: '0 16px', height: '36px' }}
                  >
                    <Plus size={14} /> à¦¨à¦¤à§à¦¨ à¦¯à§‹à¦— à¦•à¦°à§à¦¨
                  </button>
                </div>

                {!customer.addresses || customer.addresses.length === 0 ? (
                  <div className="address-empty-state">
                    <MapPin size={40} style={{ opacity: 0.3 }} />
                    <p style={{ fontWeight: 600, margin: 0 }}>à¦†à¦ªà¦¨à¦¾à¦° à¦•à§‹à¦¨à§‹ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¨à§‡à¦‡à¥¤</p>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>à¦­à¦¬à¦¿à¦·à§à¦¯à¦¤à§‡ à¦¦à§à¦°à§à¦¤ à¦…à¦°à§à¦¡à¦¾à¦° à¦•à¦°à¦¤à§‡ à¦à¦–à¦¾à¦¨à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦ à¦¿à¦•à¦¾à¦¨à¦¾à¦—à§à¦²à§‹ à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à§‡ à¦°à¦¾à¦–à¦¤à§‡ à¦ªà¦¾à¦°à§‡à¦¨à¥¤</p>
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
                                <CheckCircle2 size={12} /> à¦¡à¦¿à¦«à¦²à§à¦Ÿ
                              </span>
                            )}
                          </div>
                          
                          <div className="address-card-body" style={{ marginTop: '12px' }}>
                            <div className="address-user-name">{addr.name}</div>
                            <div className="address-user-phone">ðŸ“ž {addr.phone}</div>
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
                              à¦¡à¦¿à¦«à¦²à§à¦Ÿ à¦•à¦°à§à¦¨
                            </button>
                          )}
                          <button 
                            onClick={() => openEditAddressModal(addr)} 
                            className="address-action-btn"
                          >
                            <Edit size={12} /> à¦à¦¡à¦¿à¦Ÿ
                          </button>
                          <button 
                            onClick={() => deleteCustomerAddress(addr.id)} 
                            className="address-action-btn delete"
                          >
                            <Trash2 size={12} /> à¦¡à¦¿à¦²à¦¿à¦Ÿ
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>à¦†à¦®à¦¾à¦° à¦‰à¦‡à¦¶à¦²à¦¿à¦¸à§à¦Ÿ</h3>
              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sf-text-tertiary)' }}>
                  <Heart size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)' }}>à¦†à¦ªà¦¨à¦¾à¦° à¦‰à¦‡à¦¶à¦²à¦¿à¦¸à§à¦Ÿà¦Ÿà¦¿ à¦–à¦¾à¦²à¦¿à¥¤</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {config.products
                    .filter((product: any) => wishlist.some((id: any) => String(id) === String(product.id)))
                    .map((product: any) => (
                      <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', border: '1px solid var(--sf-border)', borderRadius: '8px', background: 'var(--sf-bg-card)' }}>
                        <img src={product.image} alt={product.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div style={{ flexGrow: 1 }}>
                          <Link to={`/product/${product.slug || product.id}`} style={{ textDecoration: 'none', color: 'var(--sf-text-primary)', fontWeight: 700 }}>{product.name}</Link>
                          <div style={{ color: 'var(--sf-accent)', fontWeight: 800, marginTop: '4px' }}>à§³{product.price}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => { addToCart(product); toggleWishlist(product.id); }} 
                            style={{ padding: '8px 12px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                          >
                            à¦•à¦¾à¦°à§à¦Ÿà§‡ à¦¯à§‹à¦— à¦•à¦°à§à¦¨
                          </button>
                          <button 
                            onClick={() => toggleWishlist(product.id)} 
                            style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                          >
                            à¦®à§à¦›à§à¦¨
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '10px' }}>à¦¶à¦ªà¦¿à¦‚ à¦•à¦¾à¦°à§à¦Ÿ</h3>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sf-text-tertiary)' }}>
                  <ShoppingCart size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)' }}>à¦†à¦ªà¦¨à¦¾à¦° à¦•à¦¾à¦°à§à¦Ÿà¦Ÿà¦¿ à¦–à¦¾à¦²à¦¿à¥¤</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {cart.map((item: any) => (
                      <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', border: '1px solid var(--sf-border)', borderRadius: '8px', background: 'var(--sf-bg-card)' }}>
                        <img src={item.product.image} alt={item.product.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div style={{ flexGrow: 1 }}>
                          <Link to={`/product/${item.product.slug || item.product.id}`} style={{ textDecoration: 'none', color: 'var(--sf-text-primary)', fontWeight: 700 }}>{item.product.name}</Link>
                          <div style={{ color: 'var(--sf-accent)', fontWeight: 800, marginTop: '4px' }}>à§³{(item.product.price * item.quantity).toFixed(2)}</div>
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
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>à¦®à§‹à¦Ÿ à¦ªà¦°à¦¿à¦®à¦¾à¦£: à§³{cartTotal.toFixed(2)}</div>
                    <Link to="/checkout" style={{ padding: '10px 24px', background: 'var(--sf-accent)', color: 'white', borderRadius: '6px', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
                      à¦šà§‡à¦•à¦†à¦‰à¦Ÿ à¦•à¦°à§à¦¨
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
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>à¦†à¦®à¦¾à¦° à¦…à¦°à§à¦¡à¦¾à¦° à¦‡à¦¤à¦¿à¦¹à¦¾à¦¸</h3>
                    <button onClick={loadCustomerOrders} disabled={loadingOrders} style={{ background: 'none', border: 'none', color: 'var(--sf-accent)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <RefreshCw size={14} className={loadingOrders ? 'animate-spin' : ''} /> à¦°à¦¿à¦«à§à¦°à§‡à¦¶ à¦•à¦°à§à¦¨
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>à¦²à§‹à¦¡à¦¿à¦‚ à¦¹à¦šà§à¦›à§‡...</div>
                  ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sf-text-tertiary)' }}>
                      <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                      <p style={{ fontWeight: 600 }}>à¦†à¦ªà¦¨à¦¾à¦° à¦•à§‹à¦¨à§‹ à¦…à¦°à§à¦¡à¦¾à¦° à¦ªà¦¾à¦“à§Ÿà¦¾ à¦¯à¦¾à§Ÿà¦¨à¦¿à¥¤</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>à¦…à¦°à§à¦¡à¦¾à¦°à§‡à¦° à¦¸à¦®à§Ÿ à¦¯à§‡ à¦‡à¦®à§‡à¦‡à¦²/à¦«à§‹à¦¨ à¦¦à¦¿à§Ÿà§‡à¦›à¦¿à¦²à§‡à¦¨ à¦¤à¦¾ à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦²à§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦®à§à¦¯à¦¾à¦š à¦•à¦°à¦¤à§‡ à¦¹à¦¬à§‡à¥¤</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {orders.map((order, idx) => {
                        const lowerSt = (order.status || '').toLowerCase().trim();
                        let badgeBg = '#fef3c7';
                        let badgeColor = '#92400e';
                        let badgeText = 'à¦…à¦ªà§‡à¦•à§à¦·à¦®à¦¾à¦¨';

                        if (lowerSt === 'delivered' || lowerSt === 'completed') {
                          badgeBg = '#d1fae5';
                          badgeColor = '#065f46';
                          badgeText = 'à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à§à¦¡';
                        } else if (lowerSt === 'shipped' || lowerSt === 'shipping') {
                          badgeBg = '#dbeafe';
                          badgeColor = '#1e40af';
                          badgeText = 'à¦•à§à¦°à¦¿à§Ÿà¦¾à¦°à§‡ à¦ªà¦¾à¦ à¦¾à¦¨à§‹ à¦¹à§Ÿà§‡à¦›à§‡';
                        } else if (lowerSt === 'processing') {
                          badgeBg = '#e0f2fe';
                          badgeColor = '#0369a1';
                          badgeText = 'à¦ªà§à¦°à¦¸à§‡à¦¸à¦¿à¦‚';
                        } else if (lowerSt === 'cancelled') {
                          badgeBg = '#fee2e2';
                          badgeColor = '#991b1b';
                          badgeText = 'à¦¬à¦¾à¦¤à¦¿à¦² à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡';
                        } else if (lowerSt === 'returned') {
                          badgeBg = '#f3e8ff';
                          badgeColor = '#6b21a8';
                          badgeText = 'à¦°à¦¿à¦Ÿà¦¾à¦°à§à¦¨ à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡';
                        }

                        return (
                          <div key={idx} style={{ border: '1px solid var(--sf-border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--sf-shadow-sm)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--sf-text-primary)', fontSize: '0.95rem' }}>à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à¦‚: #{order.id}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)', marginTop: '2px' }}>à¦¤à¦¾à¦°à¦¿à¦–: {new Date(order.date || order.created_at || Date.now()).toLocaleDateString()}</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', marginTop: '6px' }}>à¦®à§‚à¦²à§à¦¯: à§³{order.amount} ({order.items} à¦Ÿà¦¿ à¦ªà§à¦°à§‹à¦¡à¦¾à¦•à§à¦Ÿ)</div>
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
                                à¦…à¦°à§à¦¡à¦¾à¦° à¦Ÿà§à¦°à§à¦¯à¦¾à¦• à¦•à¦°à§à¦¨
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
                        <ArrowLeft size={16} /> à¦…à¦°à§à¦¡à¦¾à¦°à§‡à¦° à¦¤à¦¾à¦²à¦¿à¦•à¦¾à§Ÿ à¦«à¦¿à¦°à§‡ à¦¯à¦¾à¦¨
                      </button>

                      <div style={{ border: '1px solid var(--sf-border)', borderRadius: '16px', padding: '24px', background: 'var(--sf-bg-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--sf-border)', paddingBottom: '16px', marginBottom: '24px' }}>
                          <div>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>à¦…à¦°à§à¦¡à¦¾à¦° à¦Ÿà§à¦°à§à¦¯à¦¾à¦•à¦¿à¦‚ à¦¬à¦¿à¦¬à¦°à¦£à§€</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--sf-text-tertiary)', marginTop: '4px' }}>à¦…à¦°à§à¦¡à¦¾à¦° à¦¨à¦‚: <strong>#{currentActiveOrder.id}</strong> | à¦¤à¦¾à¦°à¦¿à¦–: {new Date(currentActiveOrder.date || currentActiveOrder.created_at || Date.now()).toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--sf-text-tertiary)' }}>à¦®à§‹à¦Ÿ à¦®à§‚à¦²à§à¦¯</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--sf-text-primary)', marginTop: '2px' }}>à§³{currentActiveOrder.amount}</div>
                          </div>
                        </div>

                        {/* Special alert banner for Cancelled / Returned orders */}
                        {trackingData.isCancelled && (
                          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={20} /> à¦à¦‡ à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦¬à¦¾à¦¤à¦¿à¦² (Cancelled) à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡à¥¤
                          </div>
                        )}
                        {trackingData.isReturned && (
                          <div style={{ background: '#f3e8ff', color: '#6b21a8', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RotateCcw size={20} /> à¦à¦‡ à¦…à¦°à§à¦¡à¦¾à¦°à¦Ÿà¦¿ à¦°à¦¿à¦Ÿà¦¾à¦°à§à¦¨ (Returned) à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡à¥¤
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
                            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)' }}>à¦•à§à¦°à¦¿à§Ÿà¦¾à¦° à¦¸à¦¾à¦°à§à¦­à¦¿à¦¸</div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px', color: 'var(--sf-text-primary)' }}>
                              {currentActiveOrder.courier || 'Pathao Courier'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-tertiary)' }}>à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾</div>
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>à¦¹à§‡à¦²à§à¦ª à¦“ à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦° à¦¸à¦¾à¦ªà§‹à¦°à§à¦Ÿ à¦šà§à¦¯à¦¾à¦Ÿ</h3>
                <span style={{ fontSize: '0.72rem', color: '#16a34a', background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Support Agent Online
                </span>
              </div>

              {/* Message scroll container */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sf-text-tertiary)', margin: 'auto' }}>
                    <MessageSquare size={48} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600 }}>à¦†à¦ªà¦¨à¦¾à¦° à¦•à§‹à¦¨à§‹ à¦®à§‡à¦¸à§‡à¦œ à¦¨à§‡à¦‡</p>
                    <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>à¦…à¦°à§à¦¡à¦¾à¦° à¦¬à¦¾ à¦•à§‹à¦¨à§‹ à¦ªà¦£à§à¦¯ à¦¨à¦¿à§Ÿà§‡ à¦¯à§‡à¦•à§‹à¦¨à§‹ à¦ªà§à¦°à¦¶à§à¦¨ à¦•à¦°à¦¤à§‡ à¦¨à¦¿à¦šà§‡ à¦®à§‡à¦¸à§‡à¦œ à¦ªà¦¾à¦ à¦¾à¦¨à¥¤</p>
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
                                    to={`/product/${productInfo.slug || productInfo.id}`} 
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
                                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isAdmin ? 'var(--sf-text-primary)' : 'white' }}>à§³{productInfo.price}</span>
                                      <span style={{ fontSize: '9px', background: 'rgba(255, 255, 255, 0.2)', color: isAdmin ? 'var(--sf-text-primary)' : 'white', padding: '1px 5px', borderRadius: '4px' }}>à¦ªà§à¦°à§‹à¦¡à¦¾à¦•à§à¦Ÿ à¦²à¦¿à¦‚à¦•</span>
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
                  placeholder="à¦†à¦ªà¦¨à¦¾à¦° à¦®à§‡à¦¸à§‡à¦œà¦Ÿà¦¿ à¦à¦–à¦¾à¦¨à§‡ à¦²à¦¿à¦–à§à¦¨..." 
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
                {editingAddress ? 'à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦à¦¡à¦¿à¦Ÿ à¦•à¦°à§à¦¨' : 'à¦¨à¦¤à§à¦¨ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¯à§‹à¦— à¦•à¦°à§à¦¨'}
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
                <label className="address-form-label">à¦ à¦¿à¦•à¦¾à¦¨à¦¾à¦° à¦²à§‡à¦¬à§‡à¦² (Label) <span>*</span></label>
                <input 
                  type="text" 
                  required 
                  value={addressLabel} 
                  onChange={e => setAddressLabel(e.target.value)} 
                  className="address-form-input" 
                  placeholder="à¦¯à§‡à¦®à¦¨: à¦¬à¦¾à¦¸à¦¾, à¦…à¦«à¦¿à¦¸, à¦¦à§‹à¦•à¦¾à¦¨" 
                />
              </div>

              <div>
                <label className="address-form-label">à¦•à¦¾à¦¸à§à¦Ÿà¦®à¦¾à¦°à§‡à¦° à¦¨à¦¾à¦® (Full Name) <span>*</span></label>
                <input 
                  type="text" 
                  required 
                  value={addressName} 
                  onChange={e => setAddressName(e.target.value)} 
                  className="address-form-input" 
                  placeholder="à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦—à§à¦°à¦¹à§€à¦¤à¦¾à¦° à¦¨à¦¾à¦®" 
                />
              </div>

              <div>
                <label className="address-form-label">à¦®à§‹à¦¬à¦¾à¦‡à¦² à¦¨à¦®à§à¦¬à¦° (Phone Number) <span>*</span></label>
                <input 
                  type="tel" 
                  required 
                  value={addressPhone} 
                  onChange={e => setAddressPhone(e.target.value)} 
                  className="address-form-input" 
                  placeholder="à¦¯à§‡à¦®à¦¨: à§¦à§§à§­XXXXXXXX" 
                />
              </div>

              <div>
                <label className="address-form-label">à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ (Detailed Address) <span>*</span></label>
                <textarea 
                  required 
                  value={addressDetail} 
                  onChange={e => setAddressDetail(e.target.value)} 
                  className="address-form-textarea" 
                  placeholder="à¦¬à¦¾à¦¸à¦¾/à¦¹à§‹à¦²à§à¦¡à¦¿à¦‚ à¦¨à¦‚, à¦°à§‹à¦¡ à¦¨à¦‚, à¦à¦²à¦¾à¦•à¦¾, à¦¥à¦¾à¦¨à¦¾ à¦“ à¦œà§‡à¦²à¦¾ à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ à¦²à¦¿à¦–à§à¦¨"
                />
              </div>

              <div className="address-form-checkbox-row" onClick={() => setAddressIsDefault(!addressIsDefault)}>
                <input 
                  type="checkbox" 
                  checked={addressIsDefault} 
                  onChange={() => {}} 
                  className="address-form-checkbox" 
                />
                <span className="address-form-checkbox-label">à¦à¦Ÿà¦¿ à¦†à¦®à¦¾à¦° à¦¡à¦¿à¦«à¦²à§à¦Ÿ à¦¡à§‡à¦²à¦¿à¦­à¦¾à¦°à¦¿ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦¹à¦¿à¦¸à§‡à¦¬à§‡ à¦¸à§‡à¦Ÿ à¦•à¦°à§à¦¨</span>
              </div>

              <div className="address-form-actions">
                <button type="button" onClick={resetAddressForm} className="address-btn-cancel">
                  à¦¬à¦¾à¦¤à¦¿à¦² à¦•à¦°à§à¦¨
                </button>
                <button type="submit" className="address-btn-save">
                  à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à§à¦¨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

