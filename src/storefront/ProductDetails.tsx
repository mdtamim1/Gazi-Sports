import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, Star, CheckCircle, Shield, Truck, RotateCcw, ChevronRight, Smartphone, Phone, MessageCircle, X, User, MapPin, Package, CreditCard, ArrowRight, Minus, Plus, Headphones, Store, Send, ChevronLeft, ZoomIn, List } from 'lucide-react';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { addOrder } from '../mock/data';
import { sendOrderToBackend, fetchProductByIdFromBackend, fetchChatHistory, validateCouponCode } from '../services/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { OptimizedImage } from '../components/layout/OptimizedImage';
import { SEOMeta } from '../components/layout/SEOMeta';
import { getWebSocketUrl } from '../utils/storefrontUtils';
import './storefront-pdp.css';
import './storefront-checkout.css';
import './storefront-account.css';

interface StorefrontContext {
  addToCart: (product: any) => void;
  toggleWishlist: (productId: number) => void;
  wishlist: number[];
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="product-stars">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={16} fill={i <= Math.round(rating) ? '#fbbf24' : 'none'} color="#fbbf24" />
    ))}
  </div>
);

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { addToCart, toggleWishlist, wishlist } = useOutletContext<StorefrontContext>();
  const [config, setConfig, configReady] = useStorefrontConfig();
  const navigate = useNavigate();
  
  const getInitialProduct = () => {
    if (!id) return null;
    const localProduct = config.products.find(p => String(p.id) === String(id) || (p.slug && String(p.slug) === String(id)));
    if (localProduct) {
      let reviewsList = localProduct.customerReviews || [];
      try {
        const storedReviews = localStorage.getItem(`product_reviews_${localProduct.id}`);
        if (storedReviews) {
          const parsed = JSON.parse(storedReviews);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = [...parsed];
            reviewsList.forEach((r: any) => {
              if (!merged.some(m => m.id === r.id)) merged.push(r);
            });
            reviewsList = merged;
          }
        }
      } catch (e) {}

      return {
        ...localProduct,
        customerReviews: reviewsList,
        reviews: reviewsList.length
      };
    }
    return null;
  };

  const initialProduct = getInitialProduct();
  const [product, setProduct] = useState<any>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [activeIdx, setActiveIdx] = useState(0);

  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    const newInitial = getInitialProduct();
    setProduct(newInitial);
    setLoading(!newInitial);
    setActiveIdx(0);
  }
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  
  const { customer, login, register, updateCustomerProfile } = useCustomerAuth();
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [shippingLocation, setShippingLocation] = useState<'dhaka' | 'outside'>('dhaka');
  const [buyNowQty, setBuyNowQty] = useState<number>(1);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<string>('');
  const [selectedKg, setSelectedKg] = useState<string>('');
  const [selectedHeight, setSelectedHeight] = useState<string>('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const getActivePrice = () => {
    if (!product) return 0;
    let price = product.price;
    const selectedLabels = [selectedSize, selectedColor, selectedWeight, selectedKg, selectedHeight].filter(Boolean);
    if (product.sizes && Array.isArray(product.sizes)) {
      for (const label of selectedLabels) {
        const match = product.sizes.find((s: any) => s.label === label && s.enabled);
        if (match && match.price && Number(match.price) > 0) {
          price = Number(match.price);
          break;
        }
      }
    }
    return price;
  };

  const getActiveOriginalPrice = () => {
    if (!product) return null;
    let originalPrice = product.originalPrice;
    const selectedLabels = [selectedSize, selectedColor, selectedWeight, selectedKg, selectedHeight].filter(Boolean);
    if (product.sizes && Array.isArray(product.sizes)) {
      for (const label of selectedLabels) {
        const match = product.sizes.find((s: any) => s.label === label && s.enabled);
        if (match) {
          if (match.originalPrice && Number(match.originalPrice) > 0) {
            originalPrice = Number(match.originalPrice);
            break;
          } else if (match.price && Number(match.price) > 0) {
            originalPrice = (product.originalPrice && product.originalPrice > Number(match.price)) ? product.originalPrice : null;
            break;
          }
        }
      }
    }
    return originalPrice;
  };

  const getMissingOptionGroup = () => {
    if (!product) return null;
    const SIZES_KEYS = ['s', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl', '6xl', 'free size'];
    const COLORS_KEYS = ['red', 'blue', 'black', 'white', 'green', 'yellow', 'grey', 'orange', 'pink', 'purple', 'navy', 'maroon', 'brown', 'gold', 'silver', 'beige', 'cream', 'olive', 'রং', 'লাল', 'নীল', 'কালো', 'সাদা', 'সবুজ', 'হলুদ', 'ধূসর', 'কমলা', 'গোলাপী'];

    if (!product.sizes || !Array.isArray(product.sizes)) return null;

    const enabled = product.sizes.filter((s: any) => s.enabled);
    const sizeOpts = enabled.filter((s: any) => {
      const label = s.label.toLowerCase().trim();
      return SIZES_KEYS.includes(label);
    });
    const colorOpts = enabled.filter((s: any) => {
      const label = s.label.toLowerCase().trim();
      return COLORS_KEYS.includes(label);
    });
    const weightOpts = enabled.filter((s: any) => {
      const label = s.label.toLowerCase().trim();
      return label.endsWith('kg') || label.endsWith('gm') || label.endsWith('g') || label.endsWith('lbs') || label.includes('kg') || label.includes('gm');
    });
    const heightOpts = enabled.filter((s: any) => {
      const label = s.label.toLowerCase().trim();
      return label.endsWith('ft') || label.endsWith('cm') || label.endsWith('inch') || label.endsWith('inches') || label.includes('ft') || label.includes('cm') || label.includes('inch');
    });
    const customOpts = enabled.filter((s: any) => {
      const label = s.label.toLowerCase().trim();
      const isPredefined = SIZES_KEYS.includes(label) || 
                           COLORS_KEYS.includes(label) || 
                           label.endsWith('kg') || label.endsWith('gm') || label.endsWith('g') || label.endsWith('lbs') || label.includes('kg') || label.includes('gm') ||
                           label.endsWith('ft') || label.endsWith('cm') || label.endsWith('inch') || label.endsWith('inches') || label.includes('ft') || label.includes('cm') || label.includes('inch');
      return !isPredefined;
    });

    if (sizeOpts.length > 0 && !selectedSize) {
      return { name: 'size', label: 'সাইজ' };
    }
    if (colorOpts.length > 0 && !selectedColor) {
      return { name: 'color', label: 'কালার' };
    }
    if (weightOpts.length > 0 && !selectedWeight) {
      return { name: 'weight', label: 'ওজন' };
    }
    if (heightOpts.length > 0 && !selectedHeight) {
      return { name: 'height', label: 'উচ্চতা' };
    }
    if (customOpts.length > 0 && !selectedSize) {
      return { name: 'custom', label: 'কাস্টম অপশন' };
    }
    return null;
  };


  const imagesList = (product?.gallery && product.gallery.length > 0)
    ? product.gallery 
    : [product?.image].filter(Boolean) as string[];
  const activeImage = imagesList[activeIdx] || product?.image || '';

  const handlePrevImage = () => {
    if (imagesList.length <= 1) return;
    setActiveIdx(prev => (prev - 1 + imagesList.length) % imagesList.length);
  };

  const handleNextImage = () => {
    if (imagesList.length <= 1) return;
    setActiveIdx(prev => (prev + 1) % imagesList.length);
  };

  // Zoom States
  const [isZoomedOpen, setIsZoomedOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleCloseZoom = () => {
    setIsZoomedOpen(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleStartDrag = (clientX: number, clientY: number) => {
    if (zoomScale === 1) return;
    setIsDragging(true);
    setDragStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handleMoveDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPanOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleEndDrag = () => {
    setIsDragging(false);
  };

  const [nameEdited, setNameEdited] = useState(false);
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);
  const [addressEdited, setAddressEdited] = useState(false);

  // Coupon states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Chat Drawer State
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [productShared, setProductShared] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Chat Quick Auth UI states
  const [chatIsRegister, setChatIsRegister] = useState(false);
  const [chatAuthEmail, setChatAuthEmail] = useState('');
  const [chatAuthPassword, setChatAuthPassword] = useState('');
  const [chatAuthName, setChatAuthName] = useState('');
  const [chatAuthPhone, setChatAuthPhone] = useState('');
  const [chatAuthError, setChatAuthError] = useState('');
  const [chatAuthSuccess, setChatAuthSuccess] = useState('');

  // Review Form states
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState('');
  const [reviewerImage, setReviewerImage] = useState<string>(''); // Base64 string
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerComment.trim()) {
      setReviewError('দয়া করে আপনার নাম এবং মতামত সঠিকভাবে লিখুন।');
      return;
    }

    const newReview = {
      id: Date.now(),
      user: reviewerName.trim(),
      rating: reviewerRating,
      date: new Date().toISOString(),
      comment: reviewerComment.trim(),
      helpful: 0,
      image: reviewerImage || undefined
    };

    // Calculate new stats
    const updatedReviews = [...(product.customerReviews || []), newReview];
    const newAverageRating = Number((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1));

    // Update in config.products
    const updatedProducts = config.products.map((p: any) => {
      if (String(p.id) === String(product.id)) {
        return {
          ...p,
          customerReviews: updatedReviews,
          reviews: updatedReviews.length,
          rating: newAverageRating
        };
      }
      return p;
    });

    // Save configuration reactively and sync with SQLite
    setConfig({
      ...config,
      products: updatedProducts
    });

    // Update local state product immediately
    setProduct((prev: any) => ({
      ...prev,
      customerReviews: updatedReviews,
      reviews: updatedReviews.length,
      rating: newAverageRating
    }));

    // Reset Form & Show Success Message
    setReviewerName('');
    setReviewerRating(5);
    setReviewerComment('');
    setReviewerImage('');
    setReviewError('');
    setReviewMsg('আপনার রিভিউটি সফলভাবে সাবমিট করা হয়েছে! ধন্যবাদ।');

    // Dismiss message after 5 seconds
    setTimeout(() => {
      setReviewMsg('');
    }, 5000);
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatDrawerOpen]);



  // Sync local storage & local state
  const syncChatData = (updated: any[]) => {
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
        const allChats = JSON.parse(stored);
        const filtered = allChats.filter((m: any) => m.customerId === customer.id);
        setChatMessages(filtered);
      } catch (e) {}
    }
  };

  // Connect WebSocket & load history when chat drawer opens
  useEffect(() => {
    if (isChatDrawerOpen && customer) {
      loadChatsLocal();

      const initializeChat = async () => {
        const history = await fetchChatHistory();
        if (history && history.length > 0) {
          syncChatData(history);
        } else {
          loadChatsLocal();
        }

        const wsUrl = getWebSocketUrl();

        try {
          const ws = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen = () => {
            console.log('⚡ Storefront PDP support chat WebSocket open.');
          };

          ws.onmessage = (event) => {
            try {
               const payload = JSON.parse(event.data);
               if (payload.type === 'message') {
                 const newMsg = payload.data;
                 const stored = localStorage.getItem('storefront_chats');
                 let chatsList = [];
                 if (stored) {
                   try {
                     chatsList = JSON.parse(stored);
                   } catch (e) {}
                 }
                 if (!chatsList.some((m: any) => m.id === newMsg.id)) {
                   const updated = [...chatsList, newMsg];
                   syncChatData(updated);
                 }
               }
            } catch (e) {
               console.error('Error parsing WebSocket message content:', e);
            }
          };
        } catch (err) {
          console.warn('Storefront WebSocket setup failed.', err);
        }
      };

      initializeChat();

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
  }, [isChatDrawerOpen, customer]);

  const handleSendChatProductShare = () => {
    if (!customer || !product || productShared) return;

    const productSharePayload = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image
    };

    const shareMessage = `PRODUCT_SHARE:${JSON.stringify(productSharePayload)}`;

    const newMsg = {
      id: `msg-${Date.now()}`,
      customerId: customer.id,
      customerName: customer.name,
      sender: 'customer',
      message: shareMessage,
      timestamp: new Date().toISOString(),
      read: false
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        customerId: customer.id,
        customerName: customer.name,
        sender: 'customer',
        message: shareMessage
      }));
    } else {
      const storedChats = localStorage.getItem('storefront_chats');
      let allChats = [];
      if (storedChats) {
        try { allChats = JSON.parse(storedChats); } catch (e) {}
      }
      syncChatData([...allChats, newMsg]);
    }
    setProductShared(true);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !inputMessage.trim()) return;

    // Automatically share the product first if not shared yet in this chat window
    if (!productShared) {
      handleSendChatProductShare();
    }

    const textMessage = inputMessage.trim();
    const newMsg = {
      id: `msg-${Date.now()}`,
      customerId: customer.id,
      customerName: customer.name,
      sender: 'customer',
      message: textMessage,
      timestamp: new Date().toISOString(),
      read: false
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        customerId: customer.id,
        customerName: customer.name,
        sender: 'customer',
        message: textMessage
      }));
    } else {
      const storedChats = localStorage.getItem('storefront_chats');
      let allChats = [];
      if (storedChats) {
        try { allChats = JSON.parse(storedChats); } catch (e) {}
      }
      syncChatData([...allChats, newMsg]);

      // Dummy auto-reply after 4 seconds (offline fallback support)
      setTimeout(() => {
        const stored = localStorage.getItem('storefront_chats');
        if (stored) {
          const chats = JSON.parse(stored);
          const lastMsg = chats.filter((m: any) => m.customerId === customer.id).pop();
          if (lastMsg && lastMsg.sender === 'customer') {
            const autoReply = {
              id: `msg-reply-${Date.now()}`,
              customerId: customer.id,
              customerName: customer.name,
              sender: 'admin',
              message: `ধন্যবাদ ${customer.name}! আমরা আপনার মেসেজটি পেয়েছি। আমাদের প্রতিনিধি প্রোডাক্টটি সম্পর্কে শীঘ্রই সাহায্য করবেন।`,
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

  const handleChatAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChatAuthError('');
    setChatAuthSuccess('');

    if (chatIsRegister) {
      if (!chatAuthName || !chatAuthEmail || !chatAuthPassword || !chatAuthPhone) {
        setChatAuthError('সবগুলো ঘর পূরণ করুন।');
        return;
      }
      const res = await register(chatAuthName, chatAuthEmail, chatAuthPassword, chatAuthPhone);
      if (!res.success) {
        setChatAuthError(res.error || 'নিবন্ধন ব্যর্থ হয়েছে।');
      } else {
        setChatAuthSuccess('অ্যাকাউন্ট তৈরি সফল হয়েছে!');
      }
    } else {
      if (!chatAuthEmail || !chatAuthPassword) {
        setChatAuthError('ইমেইল ও পাসওয়ার্ড প্রদান করুন।');
        return;
      }
      const res = await login(chatAuthEmail, chatAuthPassword);
      if (!res.success) {
        setChatAuthError(res.error || 'লগইন ব্যর্থ হয়েছে।');
      }
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If customer is logged in, sync any modified fields back to their profile
    if (customer) {
      const needsUpdate = !customer.phone || !customer.address || customer.phone !== customerPhone || customer.address !== customerAddress || customer.name !== customerName;
      if (needsUpdate) {
        updateCustomerProfile({ name: customerName, phone: customerPhone, address: customerAddress });
      }
    }

    const deliveryCharge = shippingLocation === 'dhaka' 
      ? config.delivery.insideDhakaPrice 
      : config.delivery.outsideDhakaPrice;
    const subtotal = getActivePrice() * buyNowQty;
    
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        discount = (subtotal * appliedCoupon.value) / 100;
      } else {
        discount = appliedCoupon.value;
      }
    }
    
    const total = subtotal + deliveryCharge - discount;

    if ((paymentMethod === 'bkash' || paymentMethod === 'nagad') && (!senderNumber.trim() || !trxId.trim())) {
      alert('দয়া করে আপনার প্রেরকের বিকাশ/নগদ নম্বর এবং Transaction ID (TrxID) ইনপুট দিন।');
      return;
    }

    const formattedMemo = trxId ? `TrxID: ${trxId.toUpperCase()} | Sender: ${senderNumber}` : '';

    const orderData = {
      customer: customerName,
      email: customerEmail || customer?.email || '', // Use custom email, logged in email, or empty
      amount: total,
      items: buyNowQty,
      paymentMethod: paymentMethod === 'bkash' ? 'bKash (Send Money)' : paymentMethod === 'nagad' ? 'Nagad (Send Money)' : 'Cash on Delivery',
      storeName: config.branding.storeName || 'Gazi Sports',
      phone: customerPhone,
      address: customerAddress,
      courier: shippingLocation === 'dhaka' ? 'Pathao (Dhaka)' : 'Pathao (Outside Dhaka)',
      city: shippingLocation === 'dhaka' ? 'Dhaka' : 'Outside Dhaka',
      thana: '',
      area: '',
      customerNote: customerNote,
      shopNote: '',
      paymentType: paymentMethod,
      memoNumber: formattedMemo,
      trxId: trxId.toUpperCase(),
      senderNumber: senderNumber,
      deliveryCharge: deliveryCharge,
      discount: discount,
      couponCode: appliedCoupon?.code || '',
      paidAmount: 0,
      subtotal: subtotal,
      productsList: [{
        name: product.name,
        color: selectedColor || 'Default',
        size: [
          selectedSize,
          selectedColor,
          selectedWeight,
          selectedKg,
          selectedHeight,
        ].filter(Boolean).join(' / ') || 'Free Size',
        code: product.sku,
        quantity: buyNowQty,
        price: getActivePrice(),
      }],
    };

    // Safely sync to backend SQLite database
    await sendOrderToBackend(orderData);

    // Save locally for redundancy & to ensure local Admin panel functions properly
    addOrder(orderData);

    // Track Purchase in Facebook Meta Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value: total,
        currency: 'BDT',
        content_ids: [String(product.id)],
        content_type: 'product',
        num_items: buyNowQty
      });
    }

    setCheckoutSuccess(true);
  };

  const closeCheckoutModal = () => {
    setIsCheckoutOpen(false);
    setCheckoutSuccess(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerNote('');
    setPaymentMethod('cod');
    setSenderNumber('');
    setTrxId('');
    setBuyNowQty(1);
    setSelectedSize('');
    setSelectedColor('');
    setSelectedWeight('');
    setSelectedKg('');
    setSelectedHeight('');
    setSelectedAddressId('');
    setNameEdited(false);
    setPhoneEdited(false);
    setEmailEdited(false);
    setAddressEdited(false);
    setPromoCodeInput('');
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };

  // Auto-populate checkout details when modal opens or customer loads
  useEffect(() => {
    if (isCheckoutOpen && customer) {
      if (!emailEdited) setCustomerEmail(customer.email || '');
      if (customer.addresses && customer.addresses.length > 0) {
        const defaultAddr = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
        if (defaultAddr) {
          if (!selectedAddressId) {
            setSelectedAddressId(defaultAddr.id);
          }
          if (!nameEdited) setCustomerName(defaultAddr.name);
          if (!phoneEdited) setCustomerPhone(defaultAddr.phone);
          if (!addressEdited) setCustomerAddress(defaultAddr.address);
          return;
        }
      }
      
      // Fallback to customer profile primary details
      if (!nameEdited) setCustomerName(customer.name || '');
      if (!phoneEdited) setCustomerPhone(customer.phone || '');
      if (!addressEdited) setCustomerAddress(customer.address || '');
    }
  }, [isCheckoutOpen, customer, nameEdited, phoneEdited, addressEdited, emailEdited]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setCustomerName(addr.name);
    setCustomerPhone(addr.phone);
    setCustomerAddress(addr.address);
    setNameEdited(true);
    setPhoneEdited(true);
    setAddressEdited(true);
  };
  
  useEffect(() => {
    let active = true;
    const loadProduct = async () => {
      if (!id) return;
      if (!configReady) {
        setLoading(true);
        return;
      }
      
      // Try to find the product in local config first for instant loading
      const localProduct = config.products.find(p => String(p.id) === String(id) || (p.slug && String(p.slug) === String(id)));
      if (localProduct) {
        let reviewsList = localProduct.customerReviews || [];
        
        // Local storage reviews
        try {
          const storedReviews = localStorage.getItem(`product_reviews_${id}`);
          if (storedReviews) {
            const parsed = JSON.parse(storedReviews);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const merged = [...parsed];
              reviewsList.forEach((r: any) => {
                if (!merged.some(m => m.id === r.id)) merged.push(r);
              });
              reviewsList = merged;
            }
          }
        } catch (e) {}

        const finalProduct = {
          ...localProduct,
          customerReviews: reviewsList,
          reviews: reviewsList.length
        };

        setProduct(finalProduct);
        setActiveIdx(0);
        setLoading(false);
      } else {
        // If not found in local cache, show skeleton loader
        setLoading(true);
      }

      window.scrollTo(0, 0);
      
      const dbProduct = await fetchProductByIdFromBackend(id);
      if (!active) return;

      if (dbProduct) {
        let reviewsList = dbProduct.customerReviews || [];

        // Local storage reviews
        try {
          const storedReviews = localStorage.getItem(`product_reviews_${id}`);
          if (storedReviews) {
            const parsed = JSON.parse(storedReviews);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const merged = [...parsed];
              reviewsList.forEach((r: any) => {
                if (!merged.some(m => m.id === r.id)) merged.push(r);
              });
              reviewsList = merged;
            }
          }
        } catch (e) {}

        const finalProduct = {
          ...dbProduct,
          customerReviews: reviewsList,
          reviews: reviewsList.length
        };

        setProduct(finalProduct);
        setActiveIdx(prev => {
          const len = finalProduct.gallery?.length || 0;
          if (prev >= len) return 0;
          return prev;
        });
        setLoading(false);
      } else if (!localProduct) {
        setProduct(null);
        setLoading(false);
      }
    };
    
    loadProduct();
    return () => {
      active = false;
    };
  }, [id, config.products, configReady]);

  if (loading) {
    return (
      <div className="pdp-container skeleton-container">
        <div className="pdp-grid">
          <div className="skeleton-image"></div>
          <div className="skeleton-info">
            <div className="skeleton-line w-20"></div>
            <div className="skeleton-line h-10 w-80"></div>
            <div className="skeleton-line w-40"></div>
            <div className="skeleton-line h-12 w-30"></div>
            <div className="skeleton-line h-32 w-100"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pdp-not-found">
        <h2>Product Not Found</h2>
        <p>Sorry, the product you're looking for doesn't exist or has been removed.</p>
        <Link to="/" className="store-btn store-btn-primary">Return to Shop</Link>
      </div>
    );
  }

  return (
    <div className="pdp-container">
      <SEOMeta 
        title={product.name} 
        description={product.description ? product.description.replace(/<[^>]*>/g, '').slice(0, 160) : `Buy ${product.name} at premium price.`}
        image={product.image}
        slug={`product/${product.id}`}
      />
      {/* Breadcrumbs */}
      <nav className="pdp-breadcrumbs">
        <Link to="/">Home</Link>
        <ChevronRight size={14} />
        <Link to="/">{product.category}</Link>
        <ChevronRight size={14} />
        <span>{product.name}</span>
      </nav>

      {/* Main Product Section */}
      <div className="pdp-grid">
        {/* Gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-image-container">
            <div 
              className="pdp-main-image-track"
              style={{ transform: `translateX(-${activeIdx * 100}%)` }}
            >
              {imagesList.map((img: string, i: number) => (
                <div 
                  key={i} 
                  className={`pdp-main-image-slide ${activeIdx === i ? 'active' : ''}`}
                >
                  <OptimizedImage 
                    src={img} 
                    alt={`${product.name} - View ${i + 1}`} 
                    className="pdp-main-image" 
                    width={800} 
                    height={800} 
                    priority={i === 0}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
            {product.badge && (
              <span className={`pdp-badge ${product.badge}`}>
                {product.badge === 'sale' ? `Sale! -${Math.round((1 - getActivePrice() / (getActiveOriginalPrice() || getActivePrice())) * 100)}%` : 'NEW'}
              </span>
            )}
            {imagesList.length > 1 && (
              <>
                <button 
                  className="pdp-gallery-nav-btn pdp-gallery-nav-left" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrevImage(); }}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  className="pdp-gallery-nav-btn pdp-gallery-nav-right" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNextImage(); }}
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            
            {/* Zoom button on bottom-right of main image */}
            <button 
              className="pdp-main-image-zoom-btn"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsZoomedOpen(true); }}
              aria-label="Zoom image"
            >
              <ZoomIn size={18} />
            </button>
          </div>
          <div className="pdp-thumbnails">
            {imagesList.map((img: string, i: number) => (
              <button 
                key={i} 
                className={`pdp-thumbnail ${activeIdx === i ? 'active' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                <OptimizedImage src={img} alt={`Thumbnail ${i+1}`} width={200} height={200} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="pdp-info">
          <div className="pdp-brand">{product.brand}</div>
          <h1 className="pdp-title">{product.name}</h1>
          
          <div className="pdp-rating-row">
            <StarRating rating={product.rating} />
            <span className="pdp-reviews-count">{product.reviews.toLocaleString()} Reviews</span>
            <span className="pdp-sku">SKU: {product.sku}</span>
          </div>

          <div className="pdp-price-row">
            <span className="pdp-price">
              {product.category && (product.category.toLowerCase() === 'jersey' || product.category.toLowerCase() === 'jerseys')
                ? `Tk ${getActivePrice().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `৳${getActivePrice()}`
              }
            </span>
            {getActiveOriginalPrice() && (
              <span className="pdp-original-price">
                {product.category && (product.category.toLowerCase() === 'jersey' || product.category.toLowerCase() === 'jerseys')
                  ? `Tk ${getActiveOriginalPrice()!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `৳${getActiveOriginalPrice()}`
                }
              </span>
            )}
          </div>


          {/* ====== Variant Selectors ====== */}
          {product.sizes && product.sizes.filter((s: any) => s.enabled).length > 0 && (() => {
            const SIZES_KEYS = ['s', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl', '6xl', 'free size'];
            const COLORS_KEYS = ['red', 'blue', 'black', 'white', 'green', 'yellow', 'grey', 'orange', 'pink', 'purple', 'navy', 'maroon', 'brown', 'gold', 'silver', 'beige', 'cream', 'olive', 'রং', 'লাল', 'নীল', 'কালো', 'সাদা', 'সবুজ', 'হলুদ', 'ধূসর', 'কমলা', 'গোলাপী'];

            const enabled = product.sizes.filter((s: any) => s.enabled);
            const sizeOpts = enabled.filter((s: any) => {
              const label = s.label.toLowerCase().trim();
              return SIZES_KEYS.includes(label);
            });
            const colorOpts = enabled.filter((s: any) => {
              const label = s.label.toLowerCase().trim();
              return COLORS_KEYS.includes(label);
            });
            const weightOpts = enabled.filter((s: any) => {
              const label = s.label.toLowerCase().trim();
              return label.endsWith('kg') || label.endsWith('gm') || label.endsWith('g') || label.endsWith('lbs') || label.includes('kg') || label.includes('gm');
            });
            const heightOpts = enabled.filter((s: any) => {
              const label = s.label.toLowerCase().trim();
              return label.endsWith('ft') || label.endsWith('cm') || label.endsWith('inch') || label.endsWith('inches') || label.includes('ft') || label.includes('cm') || label.includes('inch');
            });
            const customOpts = enabled.filter((s: any) => {
              const label = s.label.toLowerCase().trim();
              const isPredefined = SIZES_KEYS.includes(label) || 
                                   COLORS_KEYS.includes(label) || 
                                   label.endsWith('kg') || label.endsWith('gm') || label.endsWith('g') || label.endsWith('lbs') || label.includes('kg') || label.includes('gm') ||
                                   label.endsWith('ft') || label.endsWith('cm') || label.endsWith('inch') || label.endsWith('inches') || label.includes('ft') || label.includes('cm') || label.includes('inch');
              return !isPredefined;
            });

            const VariantGroup = ({
              label, emoji, items, selected, onSelect
            }: { label: string; emoji: string; items: any[]; selected: string; onSelect: (v: string) => void }) => {
              if (items.length === 0) return null;
              return (
                <div className="pdp-variant-group">
                  <div className="pdp-variant-label">
                    <span>{emoji} {label}</span>
                    {selected && <span className="pdp-variant-selected-badge">{selected}</span>}
                  </div>
                  <div className="pdp-variant-options">
                    {items.map((item: any) => (
                      <button
                        key={item.label}
                        type="button"
                        className={`pdp-variant-btn${selected === item.label ? ' active' : ''}`}
                        onClick={() => onSelect(selected === item.label ? '' : item.label)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <div className="pdp-variants-container">
                <VariantGroup label="সাইজ" emoji="📐" items={sizeOpts} selected={selectedSize} onSelect={setSelectedSize} />
                <VariantGroup label="কালার" emoji="🎨" items={colorOpts} selected={selectedColor} onSelect={setSelectedColor} />
                <VariantGroup label="ওজন" emoji="⚖️" items={weightOpts} selected={selectedWeight} onSelect={setSelectedWeight} />
                <VariantGroup label="উচ্চতা" emoji="📏" items={heightOpts} selected={selectedHeight} onSelect={setSelectedHeight} />
                <VariantGroup label="কাস্টম" emoji="✨" items={customOpts} selected={selectedSize} onSelect={setSelectedSize} />
                
                {(() => {
                  const missingGroups: string[] = [];
                  if (sizeOpts.length > 0 && !selectedSize) missingGroups.push('সাইজ');
                  if (colorOpts.length > 0 && !selectedColor) missingGroups.push('কালার');
                  if (weightOpts.length > 0 && !selectedWeight) missingGroups.push('ওজন');
                  if (heightOpts.length > 0 && !selectedHeight) missingGroups.push('উচ্চতা');
                  if (customOpts.length > 0 && !selectedSize) missingGroups.push('কাস্টম অপশন');

                  if (missingGroups.length === 0) return null;

                  return (
                    <div className="pdp-variant-warn">
                      ⚠️ অর্ডার করতে দয়া করে আপনার {missingGroups.join(', ')} সিলেক্ট করুন।
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {(() => {
            const isOutOfStock = product.inStock === false || (product.stock !== undefined && product.stock <= 0);
            return (
              <>
                <div className="pdp-stock-status" style={{ color: isOutOfStock ? 'var(--sf-danger)' : 'var(--sf-success)' }}>
                  {isOutOfStock ? (
                    <>
                      <X size={20} color="var(--sf-danger)" />
                      <span style={{ fontWeight: 600 }}>স্টক আউট (Out of Stock)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} color="var(--sf-success)" />
                      <span>In Stock and ready to ship</span>
                    </>
                  )}
                </div>

                <div className="pdp-actions">
                  <button 
                    disabled={isOutOfStock}
                    className="store-btn store-btn-primary pdp-add-to-cart" 
                    style={{ 
                      opacity: isOutOfStock ? 0.6 : 1, 
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer' 
                    }}
                    onClick={() => {
                      const missing = getMissingOptionGroup();
                      if (missing) {
                        alert(`দয়া করে প্রথমে ${missing.label} সিলেক্ট করুন!`);
                        return;
                      }
                      const variantLabel = [selectedSize, selectedColor, selectedWeight, selectedKg, selectedHeight].filter(Boolean).join(' / ') || 'Free Size';
                      addToCart({ ...product, price: getActivePrice(), selectedSize: variantLabel });
                    }}
                  >
                    <ShoppingCart size={20} /> {isOutOfStock ? 'স্টক আউট' : 'Add to Cart'}
                  </button>
                  <button 
                    disabled={isOutOfStock}
                    onClick={() => {
                      const missing = getMissingOptionGroup();
                      if (missing) {
                        alert(`দয়া করে প্রথমে ${missing.label} সিলেক্ট করুন!`);
                        return;
                      }
                      const variantLabel = [selectedSize, selectedColor, selectedWeight, selectedKg, selectedHeight].filter(Boolean).join(' / ') || 'Free Size';
                      const buyProduct = { ...product, price: getActivePrice(), selectedSize: variantLabel };
                      navigate('/checkout', { state: { product: buyProduct, quantity: 1 } });
                    }}
                    className="store-btn pdp-buy-now" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer', 
                      border: 'none',
                      opacity: isOutOfStock ? 0.6 : 1
                    }}
                  >
                    {isOutOfStock ? 'স্টক আউট' : 'Order Now'}
                  </button>
            <div className="pdp-action-icons">
              <button 
                className={`pdp-icon-btn ${wishlist.includes(product.id) ? 'active' : ''}`}
                onClick={() => toggleWishlist(product.id)}
                title="Add to Wishlist"
              >
                <Heart size={24} fill={wishlist.includes(product.id) ? '#ef4444' : 'none'} />
              </button>
              <button className="pdp-icon-btn" title="Share">
                <Share2 size={22} />
              </button>
            </div>
          </div>
              </>
            );
          })()}

          <div className="pdp-contact-actions">
            {config.contactInfo.whatsappNumber && (
              <a 
                href={`https://wa.me/${config.contactInfo.whatsappNumber}?text=I%20want%20to%20buy%20${encodeURIComponent(product.name)}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="pdp-contact-btn pdp-whatsapp"
              >
                <Smartphone size={18} /> WhatsApp এ কথা বলুন
              </a>
            )}
            {config.contactInfo.phoneNumber && (
              <a href={`tel:${config.contactInfo.phoneNumber}`} className="pdp-contact-btn pdp-call">
                <Phone size={18} /> সরাসরি কল: {config.contactInfo.phoneNumber}
              </a>
            )}
            {config.contactInfo.messengerUrl && (
              <a 
                href={config.contactInfo.messengerUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="pdp-contact-btn pdp-messenger"
              >
                <MessageCircle size={18} /> মেসেঞ্জার
              </a>
            )}
          </div>

          <div className="pdp-trust-badges">
            <div className="trust-badge"><Truck size={20} /> Fast Delivery</div>
            <div className="trust-badge"><Shield size={20} /> 1 Year Warranty</div>
            <div className="trust-badge"><RotateCcw size={20} /> 30-Day Returns</div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="pdp-tabs-container">
        <div className="pdp-tabs-header">
          <button className={`pdp-tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
          <button className={`pdp-tab ${activeTab === 'specs' ? 'active' : ''}`} onClick={() => setActiveTab('specs')}>Specifications</button>
          <button className={`pdp-tab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>Reviews ({product.customerReviews?.length || 0})</button>
        </div>
        
        <div className="pdp-tab-content">
          {activeTab === 'description' && (
            <div className="pdp-description-tab">
              <h3>Product Overview</h3>
              <p>{product.description}</p>
              <h4>Key Features</h4>
              <ul>
                {product.features.map((feat: string, i: number) => <li key={i}>{feat}</li>)}
              </ul>
            </div>
          )}
          
          {activeTab === 'specs' && (
            <div className="pdp-specs-tab">
              <table className="pdp-specs-table">
                <tbody>
                  {product.specs.map((spec: { name: string; value: string }, i: number) => (
                    <tr key={i}>
                      <th>{spec.name}</th>
                      <td>{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}



          {activeTab === 'reviews' && (
            <div className="pdp-reviews-tab">
              
              {/* Existing Reviews List */}
              <div className="pdp-reviews-list" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sf-text-primary)', marginBottom: '20px' }}>
                  কাস্টমার রিভিউসমূহ ({product.customerReviews?.length || 0})
                </h3>
                {product.customerReviews && product.customerReviews.length > 0 ? (
                  product.customerReviews.map((review: any) => (
                    <div key={review.id} className="pdp-review-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--sf-bg-light)', border: '1px solid var(--sf-border)', marginBottom: '16px' }}>
                      <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="review-user" style={{ fontWeight: 800, color: 'var(--sf-text-primary)', fontSize: '0.95rem' }}>{review.user}</span>
                        <span className="review-date" style={{ fontSize: '0.8rem', color: 'var(--sf-text-tertiary)' }}>{new Date(review.date).toLocaleDateString('bn-BD')}</span>
                      </div>
                      <StarRating rating={review.rating} />
                      <p className="review-comment" style={{ margin: '10px 0 0 0', color: 'var(--sf-text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>{review.comment}</p>
                      
                      {/* Review Photo Attachment */}
                      {review.image && (
                        <div style={{ marginTop: '12px' }}>
                          <img 
                            src={review.image} 
                            alt="Review attachment" 
                            onClick={() => setLightboxImage(review.image)}
                            style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--sf-border)', cursor: 'pointer' }} 
                            className="hover-scale"
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--sf-text-tertiary)' }}>এই প্রোডাক্টে এখনও কোনো রিভিউ দেওয়া হয়নি। প্রথম রিভিউটি আপনিই দিন!</p>
                )}
              </div>

              {/* Write a Review Form */}
              <div className="pdp-write-review-form" style={{ background: 'var(--sf-bg-light)', padding: '24px', borderRadius: '16px', border: '1px solid var(--sf-border)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sf-text-primary)', marginBottom: '16px' }}>একটি রিভিউ লিখুন</h3>
                
                {reviewMsg && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '16px' }}>
                    {reviewMsg}
                  </div>
                )}

                {reviewError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '16px' }}>
                    {reviewError}
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Name Input */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sf-text-secondary)' }}>আপনার নাম (Your Name)</label>
                    <input 
                      type="text" 
                      placeholder="আপনার নাম লিখুন" 
                      required 
                      value={reviewerName} 
                      onChange={(e) => setReviewerName(e.target.value)} 
                      style={{ padding: '10px 14px', border: '1px solid var(--sf-border)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: 'var(--sf-bg-main)', color: 'var(--sf-text-primary)' }}
                    />
                  </div>

                  {/* Rating Selector */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sf-text-secondary)' }}>রেটিং সিলেক্ট করুন (Rating)</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setReviewerRating(stars)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Star 
                            size={24} 
                            fill={stars <= reviewerRating ? '#fbbf24' : 'none'} 
                            color="#fbbf24" 
                          />
                        </button>
                      ))}
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sf-text-secondary)', marginLeft: '8px' }}>
                        {reviewerRating} / 5
                      </span>
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sf-text-secondary)' }}>মন্তব্য লিখুন (Your Review)</label>
                    <textarea 
                      placeholder="এখানে আপনার মতামত লিখুন..." 
                      required 
                      rows={4}
                      value={reviewerComment} 
                      onChange={(e) => setReviewerComment(e.target.value)} 
                      style={{ padding: '10px 14px', border: '1px solid var(--sf-border)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: 'var(--sf-bg-main)', color: 'var(--sf-text-primary)' }}
                    />
                  </div>

                  {/* Photo Upload Attachment */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sf-text-secondary)' }}>প্রোডাক্টের ছবি যোগ করুন (Add Photo - Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setReviewerImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                      style={{ fontSize: '0.85rem', color: 'var(--sf-text-secondary)' }}
                    />
                    
                    {reviewerImage && (
                      <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                        <img 
                          src={reviewerImage} 
                          alt="Review attachment preview" 
                          style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--sf-border)' }} 
                        />
                        <button
                          type="button"
                          onClick={() => setReviewerImage('')}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    className="store-btn"
                    style={{ background: 'var(--sf-accent)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', alignSelf: 'flex-start' }}
                  >
                    রিভিউ সাবমিট করুন
                  </button>

                </form>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Video & Photo Reviews Section */}
      {(product.videoUrl || product.video_url || product.photoContent || product.photo_content) && (
        <div className="pdp-tabs-container pdp-media-section" style={{ padding: '30px', background: 'white', marginTop: '40px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sf-text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={22} color="var(--sf-accent)" />
            ভিডিও ও ছবি রিভিউ (Video & Photo Reviews)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="pdp-media-grid">
              {(product.videoUrl || product.video_url) && (
                <div style={{ background: 'var(--sf-bg-light)', padding: '20px', borderRadius: '12px', border: '1px solid var(--sf-border)' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--sf-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sf-accent)' }} />
                    ভিডিও রিভিউ (Product Video Content)
                  </h4>
                  {((product.videoUrl || product.video_url).includes('youtube.com') || (product.videoUrl || product.video_url).includes('youtu.be') || (product.videoUrl || product.video_url).includes('shorts')) ? (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                      <iframe
                        src={getEmbedUrl(product.videoUrl || product.video_url)}
                        title="Product Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '12px' }}
                      />
                    </div>
                  ) : (
                    <video controls src={product.videoUrl || product.video_url} style={{ width: '100%', borderRadius: '12px', maxHeight: '400px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }} />
                  )}
                </div>
              )}
              {(product.photoContent || product.photo_content) && (
                <div style={{ background: 'var(--sf-bg-light)', padding: '20px', borderRadius: '12px', border: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--sf-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sf-accent)' }} />
                    ছবি রিভিউ কনটেন্ট (Additional Photo Review)
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'center', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', flexGrow: 1, alignItems: 'center', background: 'var(--sf-bg-main)' }}>
                    <img 
                      src={product.photoContent || product.photo_content} 
                      alt="Product Photo Content" 
                      onClick={() => setLightboxImage(product.photoContent || product.photo_content)}
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px', maxHeight: '350px', objectFit: 'contain', cursor: 'pointer' }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Related / Suggested Products */}
      {product && (() => {
        const related = config.products.filter(p => String(p.id) !== String(product.id) && p.category === product.category && p.published).slice(0, 4);
        if (related.length === 0) return null;
        
        return (
          <div className="pdp-related">
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sf-text-primary)', marginBottom: '20px' }}>আপনাদের পছন্দের অন্যান্য পণ্য (Suggested Products)</h3>
            <div className="new-arrivals-grid">
              {related.map((relatedProduct: any) => {
                const isJersey = relatedProduct.category && (relatedProduct.category.toLowerCase() === 'jersey' || relatedProduct.category.toLowerCase() === 'jerseys');
                const hasDiscount = relatedProduct.originalPrice && relatedProduct.originalPrice > relatedProduct.price;
                const discountPercent = hasDiscount ? Math.round((1 - relatedProduct.price / relatedProduct.originalPrice) * 100) : 0;
                
                if (isJersey) {
                  const isSoldOut = !relatedProduct.inStock || (relatedProduct.stock !== undefined && relatedProduct.stock <= 0);
                  return (
                    <Link to={`/product/${relatedProduct.slug || relatedProduct.id}`} key={relatedProduct.id} className="jersey-product-card" style={{ textDecoration: 'none' }}>
                      <div className="jersey-product-image-container">
                        <OptimizedImage src={relatedProduct.image} alt={relatedProduct.name} className="jersey-product-image" width={400} height={533} />
                        <div className="jersey-badges-container">
                          <span className="jersey-badge jersey-badge-limited">LIMITED STOCK</span>
                          {hasDiscount && (
                            <span className="jersey-badge jersey-badge-discount">-{discountPercent}%</span>
                          )}
                          {isSoldOut && (
                            <span className="jersey-badge jersey-badge-soldout">Sold out</span>
                          )}
                        </div>
                      </div>
                      <div className="jersey-product-body">
                        <h3 className="jersey-product-name">{relatedProduct.name}</h3>
                        <div className="jersey-product-price-row">
                          {hasDiscount && (
                            <span className="jersey-product-original-price">
                              Tk {relatedProduct.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          <span className="jersey-product-price">
                            Tk {relatedProduct.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                }

                const hasOptions = relatedProduct.sizes && relatedProduct.sizes.some((s: any) => s.enabled);
                return (
                  <Link to={`/product/${relatedProduct.slug || relatedProduct.id}`} key={relatedProduct.id} className="trending-product-card" style={{ textDecoration: 'none' }}>
                    <div className="trending-product-image-container">
                      <OptimizedImage src={relatedProduct.image} alt={relatedProduct.name} className="trending-product-image" width={400} height={400} />
                      {hasDiscount ? (
                        <span className="trending-product-badge">
                          -{discountPercent}%
                        </span>
                      ) : relatedProduct.badge ? (
                        <span className="trending-product-badge">
                          {relatedProduct.badge === 'sale' ? 'Sale!' : 'New'}
                        </span>
                      ) : null}
                    </div>
                    <div className="trending-product-body">
                      <h3 className="trending-product-name">{relatedProduct.name}</h3>
                      <div className="trending-product-price-row">
                        {hasDiscount && (
                          <span className="trending-product-original-price">
                            ৳ {relatedProduct.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="trending-product-price">
                          ৳ {relatedProduct.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="trending-product-action-container">
                        {hasOptions ? (
                          <span className="trending-product-action-btn">
                            <List size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Select options
                          </span>
                        ) : (
                          <button
                            className="trending-product-action-btn-raw"
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              addToCart({
                                id: relatedProduct.id,
                                name: relatedProduct.name,
                                price: relatedProduct.price,
                                image: relatedProduct.image,
                                quantity: 1
                              }); 
                            }}
                          >
                            <ShoppingCart size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Add to cart
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="pdp-mobile-sticky-bar">
        <Link to="/" className="sticky-bar-icon-btn">
          <Store size={20} />
          <span>স্টোর</span>
        </Link>
        <a 
          href={config.contactInfo.messengerUrl || 'https://m.me/gazisports'} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="sticky-bar-icon-btn" 
        >
          <svg 
            viewBox="0 0 24 24" 
            width="20" 
            height="20" 
            fill="currentColor"
            style={{ color: '#00B2FF' }}
          >
            <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.458 5.512 3.738 7.218.196.147.316.38.316.628l-.004 1.834c-.002.395.405.69.774.55l2.083-.794a.897.897 0 0 1 .632.036c.773.238 1.597.368 2.457.368 5.523 0 10-4.146 10-9.258C22 6.145 17.523 2 12 2zm1.025 12.274l-2.62-2.795-5.112 2.795 5.62-5.962 2.62 2.795 5.112-2.795-5.62 5.962z"/>
          </svg>
          <span>মেসেঞ্জার</span>
        </a>
        <div className="sticky-bar-actions">
          {(() => {
            const isOutOfStock = product.inStock === false || (product.stock !== undefined && product.stock <= 0);
            return (
              <>
                <button 
                  disabled={isOutOfStock}
                  type="button" 
                  className="sticky-bar-btn buy-now" 
                  style={{ opacity: isOutOfStock ? 0.6 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                  onClick={() => {
                    const missing = getMissingOptionGroup();
                    if (missing) {
                      alert(`দয়া করে প্রথমে ${missing.label} সিলেক্ট করুন!`);
                      return;
                    }
                    const variantLabel = [selectedSize, selectedColor, selectedWeight, selectedKg, selectedHeight].filter(Boolean).join(' / ') || 'Free Size';
                    const buyProduct = { ...product, price: getActivePrice(), selectedSize: variantLabel };
                    navigate('/checkout', { state: { product: buyProduct, quantity: 1 } });
                  }}
                >
                  {isOutOfStock ? 'স্টক আউট' : 'Order Now'}
                </button>
                <button 
                  disabled={isOutOfStock}
                  type="button" 
                  className="sticky-bar-btn add-to-cart" 
                  style={{ opacity: isOutOfStock ? 0.6 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                  onClick={() => {
                    const missing = getMissingOptionGroup();
                    if (missing) {
                      alert(`দয়া করে প্রথমে ${missing.label} সিলেক্ট করুন!`);
                      return;
                    }
                    const variantLabel = [selectedSize, selectedColor, selectedWeight, selectedKg, selectedHeight].filter(Boolean).join(' / ') || 'Free Size';
                    addToCart({ ...product, price: getActivePrice(), selectedSize: variantLabel });
                  }}
                >
                  {isOutOfStock ? 'স্টক আউট' : 'Add to Cart'}
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Live Support Chat Drawer */}
      {isChatDrawerOpen && (
        <div className="pdp-chat-drawer-overlay" onClick={() => setIsChatDrawerOpen(false)}>
          <div className="pdp-chat-drawer" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="pdp-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  {customer ? customer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'G'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>কাস্টমার চ্যাট সাপোর্ট</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Support Agent Online</div>
                </div>
              </div>
              <button onClick={() => setIsChatDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {customer ? (
              <>
                {/* Messages List */}
                <div className="pdp-chat-messages">
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sf-text-tertiary)', margin: 'auto' }}>
                      <MessageCircle size={40} style={{ opacity: 0.15, marginBottom: '12px', display: 'inline-block' }} />
                      <p style={{ fontWeight: 600, color: 'var(--sf-text-secondary)', fontSize: '0.85rem' }}>আপনার কোনো মেসেজ নেই</p>
                      <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>এই পণ্যটি নিয়ে সরাসরি এডমিনের সাথে কথা বলতে নিচে মেসেজ করুন।</p>
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
                            {msg.message.startsWith('PRODUCT_SHARE:') ? (
                              (() => {
                                try {
                                  const productInfo = JSON.parse(msg.message.substring(14));
                                  return (
                                    <Link 
                                      to={`/product/${productInfo.slug || productInfo.id}`} 
                                      onClick={() => setIsChatDrawerOpen(false)}
                                      style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '6px', 
                                        textDecoration: 'none', 
                                        color: 'inherit',
                                        background: isAdmin ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.15)',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        width: '180px'
                                      }}
                                    >
                                      <img 
                                        src={productInfo.image} 
                                        alt={productInfo.name} 
                                        style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }} 
                                      />
                                      <div style={{ fontWeight: 700, fontSize: '0.7rem', color: isAdmin ? '#1e293b' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {productInfo.name}
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.8rem', color: isAdmin ? '#1e293b' : 'white' }}>৳{productInfo.price}</span>
                                        <span style={{ fontSize: '8px', background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: '2px' }}>লিংক</span>
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

                {/* Footer Input */}
                <div className="pdp-chat-footer">
                  {/* Share Product Hint */}
                  {!productShared && (
                    <div className="pdp-chat-product-preview-bar">
                      <img src={product.image} alt={product.name} />
                      <div className="pdp-chat-product-preview-bar-info">
                        {product.name}
                      </div>
                      <button 
                        type="button" 
                        className="pdp-chat-product-preview-bar-btn"
                        onClick={handleSendChatProductShare}
                      >
                        প্রোডাক্ট লিংক পাঠান
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendChatMessage} className="pdp-chat-input-row">
                    <input 
                      type="text" 
                      className="pdp-chat-input" 
                      placeholder="মেসেজ লিখুন..." 
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                    />
                    <button type="submit" className="pdp-chat-send-btn">
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Quick Auth inside Chat Drawer */
              <div className="pdp-chat-auth-container">
                <div className="pdp-chat-auth-title">
                  {chatIsRegister ? 'নতুন অ্যাকাউন্ট খুলুন' : 'চ্যাট করতে লগইন করুন'}
                </div>
                <div className="pdp-chat-auth-desc">
                  এডমিনের সাথে সরাসরি কথা বলতে এবং আপনার মেসেজ ট্র্যাক করতে সাইন ইন করুন
                </div>

                {chatAuthError && (
                  <div style={{ background: '#fee2e2', color: '#ef4444', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem' }}>
                    {chatAuthError}
                  </div>
                )}
                {chatAuthSuccess && (
                  <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem' }}>
                    {chatAuthSuccess}
                  </div>
                )}

                <form onSubmit={handleChatAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {chatIsRegister && (
                    <>
                      <input 
                        type="text" 
                        required 
                        className="pdp-chat-auth-input" 
                        placeholder="আপনার নাম" 
                        value={chatAuthName}
                        onChange={e => setChatAuthName(e.target.value)}
                      />
                      <input 
                        type="tel" 
                        required 
                        className="pdp-chat-auth-input" 
                        placeholder="যেমন: ০১৭XXXXXXXX" 
                        value={chatAuthPhone}
                        onChange={e => setChatAuthPhone(e.target.value)}
                      />
                    </>
                  )}
                  <input 
                    type="email" 
                    required 
                    className="pdp-chat-auth-input" 
                    placeholder="ইমেইল ঠিকানা" 
                    value={chatAuthEmail}
                    onChange={e => setChatAuthEmail(e.target.value)}
                  />
                  <input 
                    type="password" 
                    required 
                    className="pdp-chat-auth-input" 
                    placeholder="পাসওয়ার্ড" 
                    value={chatAuthPassword}
                    onChange={e => setChatAuthPassword(e.target.value)}
                  />
                  <button type="submit" className="pdp-chat-auth-btn">
                    {chatIsRegister ? 'রেজিস্ট্রেশন করুন' : 'লগইন করুন'}
                  </button>
                </form>



                <div className="pdp-chat-auth-toggle">
                  {chatIsRegister ? (
                    <>
                      অলরেডি অ্যাকাউন্ট আছে?
                      <button onClick={() => { setChatIsRegister(false); setChatAuthError(''); }}>লগইন করুন</button>
                    </>
                  ) : (
                    <>
                      অ্যাকাউন্ট নেই?
                      <button onClick={() => { setChatIsRegister(true); setChatAuthError(''); }}>রেজিস্ট্রেশন করুন</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Review Images */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <img 
            src={lightboxImage} 
            alt="Enlarged review attachment" 
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }} 
          />
        </div>
      )}

      {/* Full-Screen Zoom Lightbox */}
      {isZoomedOpen && (
        <div className="pdp-zoom-lightbox" onClick={handleCloseZoom}>
          {/* Top toolbar */}
          <div className="pdp-lightbox-toolbar" onClick={e => e.stopPropagation()}>
            <button className="pdp-lightbox-btn" onClick={handleZoomOut} disabled={zoomScale <= 1} title="Zoom Out">
              <Minus size={20} />
            </button>
            <span className="pdp-lightbox-zoom-percent">{Math.round(zoomScale * 100)}%</span>
            <button className="pdp-lightbox-btn" onClick={handleZoomIn} disabled={zoomScale >= 4} title="Zoom In">
              <Plus size={20} />
            </button>
            <button className="pdp-lightbox-btn" onClick={handleResetZoom} title="Reset Zoom">
              <RotateCcw size={18} />
            </button>
            <div style={{ flex: 1 }} />
            <button className="pdp-lightbox-btn close" onClick={handleCloseZoom} title="Close">
              <X size={20} />
            </button>
          </div>

          {/* Main content area */}
          <div 
            className="pdp-lightbox-content"
            onMouseMove={e => handleMoveDrag(e.clientX, e.clientY)}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleStartDrag(e.clientX, e.clientY); }}
            onMouseUp={handleEndDrag}
            onMouseLeave={handleEndDrag}
            onTouchStart={e => {
              const touch = e.touches[0];
              handleStartDrag(touch.clientX, touch.clientY);
            }}
            onTouchMove={e => {
              const touch = e.touches[0];
              handleMoveDrag(touch.clientX, touch.clientY);
            }}
            onTouchEnd={handleEndDrag}
          >
            <img 
              src={activeImage} 
              alt="Zoomed product"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                maxHeight: '85vh',
                maxWidth: '90vw',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                userSelect: 'none'
              }}
              onClick={e => e.stopPropagation()}
              className="pdp-lightbox-image"
            />
          </div>

          {/* Next/Prev buttons in Lightbox */}
          {product.gallery && product.gallery.length > 1 && (
            <>
              <button 
                className="pdp-lightbox-nav-btn left" 
                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                className="pdp-lightbox-nav-btn right" 
                onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('embed/')) return url;
  let videoId = '';
  if (url.includes('shorts/')) {
    videoId = url.split('shorts/')[1]?.split('?')[0] || '';
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
  } else if (url.includes('v=')) {
    videoId = url.split('v=')[1]?.split('&')[0] || '';
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};
