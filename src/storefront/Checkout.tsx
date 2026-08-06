import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Truck, RotateCcw, Headphones, User, MapPin, Package, CreditCard, CheckCircle, Zap, ArrowRight, Minus, Plus } from 'lucide-react';
import { storeProducts } from './data';
import { addOrder } from '../mock/data';
import { sendOrderToBackend, validateCouponCode } from '../services/api';
import { useStorefrontConfig } from '../store/storefrontConfig';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import './storefront-checkout.css';
import './storefront-account.css';

interface StorefrontContext {
  cart: { product: any, quantity: number }[];
  cartTotal: number;
  clearCart?: () => void;
  updateQuantity: (productId: number, sizeOrDelta: string | number, possibleDelta?: number) => void;
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [config] = useStorefrontConfig();
  const { customer, updateCustomerPhone, updateCustomerProfile, addCustomerAddress } = useCustomerAuth();
  
  const buyNowProduct = location.state?.product as any;
  const [buyNowQty, setBuyNowQty] = useState<number>(location.state?.quantity as number || 1);
  
  const { cart: contextCart, cartTotal: contextCartTotal, updateQuantity, clearCart } = useOutletContext<StorefrontContext>() || { cart: [], cartTotal: 0, updateQuantity: () => {} };
  
  const items = buyNowProduct ? [{ product: buyNowProduct, quantity: buyNowQty }] : (contextCart || []);
  const subtotal = buyNowProduct ? (buyNowProduct.price * buyNowQty) : (contextCartTotal || 0);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [shippingLocation, setShippingLocation] = useState<'dhaka' | 'outside'>('dhaka');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | number>('');
  const [saveAddress, setSaveAddress] = useState(true);
  
  // Payment gateway states
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');

  // Coupon states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  const [nameEdited, setNameEdited] = useState(false);
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);
  const [addressEdited, setAddressEdited] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    
    if (!promoCodeInput.trim()) return;
    
    setIsValidating(true);
    const res = await validateCouponCode(promoCodeInput.trim());
    setIsValidating(false);
    
    if (res.status === 'success') {
      setAppliedCoupon(res.data);
      setCouponSuccess(`Coupon code '${res.data.code}' added successfully!`);
    } else {
      setCouponError(res.message || 'This coupon is not applicable.');
      setAppliedCoupon(null);
    }
  };
  
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setPromoCodeInput('');
    setCouponSuccess('');
    setCouponError('');
  };
  
  const deliveryCharge = shippingLocation === 'dhaka' 
    ? config.delivery.insideDhakaPrice 
    : config.delivery.outsideDhakaPrice;

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discount = (subtotal * appliedCoupon.value) / 100;
    } else {
      discount = appliedCoupon.value;
    }
  }
  
  const total = subtotal + deliveryCharge - discount;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update form fields dynamically if customer logs in or state changes
  useEffect(() => {
    if (customer) {
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
      
      // Fallback if no saved address array is found
      if (!nameEdited) setCustomerName(customer.name || '');
      if (!phoneEdited) setCustomerPhone(customer.phone || '');
      if (!addressEdited) setCustomerAddress(customer.address || '');
    }
  }, [customer, nameEdited, phoneEdited, addressEdited, emailEdited]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setCustomerName(addr.name);
    setCustomerPhone(addr.phone);
    setCustomerAddress(addr.address);
    setNameEdited(true);
    setPhoneEdited(true);
    setAddressEdited(true);
  };

  const handleQuantityChange = (productId: number, size: string, delta: number) => {
    if (buyNowProduct && buyNowProduct.id === productId) {
      setBuyNowQty(prev => Math.max(1, prev + delta));
    } else {
      updateQuantity(productId, size, delta);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((paymentMethod === 'bkash' || paymentMethod === 'nagad') && (!senderNumber.trim() || !trxId.trim())) {
      alert('Please enter your sender bKash/Nagad number and Transaction ID (TrxID).');
      return;
    }

    // If customer is logged in, sync any modified fields back to their profile
    if (customer) {
      const needsUpdate = !customer.phone || !customer.address || customer.phone !== customerPhone || customer.address !== customerAddress || customer.name !== customerName;
      if (needsUpdate) {
        updateCustomerProfile({ name: customerName, phone: customerPhone, address: customerAddress });
      }

      // Save address to profile if checked and not a duplicate
      if (saveAddress) {
        const isDuplicate = customer.addresses?.some(addr => 
          addr.name === customerName && 
          addr.phone === customerPhone && 
          addr.address === customerAddress
        );
        if (!isDuplicate) {
          addCustomerAddress({
            label: 'Shipping Address',
            name: customerName,
            phone: customerPhone,
            address: customerAddress,
            isDefault: !customer.addresses || customer.addresses.length === 0
          });
        }
      }
    }

    const formattedMemo = trxId ? `TrxID: ${trxId.toUpperCase()} | Sender: ${senderNumber}` : '';

    const orderData = {
      customer: customerName,
      email: customerEmail || customer?.email || '', // Use custom email, logged in email, or empty
      amount: total,
      items: items.reduce((acc, item) => acc + item.quantity, 0),
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
      productsList: items.map(item => ({
        name: item.product.name,
        color: 'Default',
        size: item.product.selectedSize || 'Free Size',
        code: item.product.sku,
        quantity: item.quantity,
        price: item.product.price,
      })),
    };

    // Safely attempt backend sync
    const success = await sendOrderToBackend(orderData);
    if (!success) {
      try {
        const pending = JSON.parse(localStorage.getItem('pending_sync_orders') || '[]');
        pending.push(orderData);
        localStorage.setItem('pending_sync_orders', JSON.stringify(pending));
      } catch (err) {
        console.error('Failed to queue offline order:', err);
      }
    }

    // Save locally for redundancy & to ensure local Admin panel functions properly
    addOrder(orderData);

    // Remove used coupon from customer account local cache & spin wheel storage
    if (appliedCoupon) {
      const cleanCode = appliedCoupon.code.trim().toUpperCase();
      try {
        const spinReward = localStorage.getItem('spin_win_reward');
        if (spinReward) {
          const parsed = JSON.parse(spinReward);
          if (parsed.code && parsed.code.trim().toUpperCase() === cleanCode) {
            localStorage.removeItem('spin_win_reward');
          }
        }
      } catch (e) {}

      if (customer && customer.email) {
        const cacheKey = `customer_coupons_${customer.email.trim().toLowerCase()}`;
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const updated = parsed.filter((c: any) => c.code.trim().toUpperCase() !== cleanCode);
              localStorage.setItem(cacheKey, JSON.stringify(updated));
            }
          }
        } catch (e) {}
      }
    }
    
    // Clear storefront cart if checkout succeeded
    if (clearCart && !buyNowProduct) {
      clearCart();
    }
    
    // Track Purchase in Facebook Meta Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value: total,
        currency: 'BDT',
        content_ids: items.map(item => String(item.product.id)),
        content_type: 'product',
        num_items: items.reduce((sum, item) => sum + item.quantity, 0)
      });
    }
    
    setSubmittedOrder({
      invoiceNo: `GS-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      customerName,
      customerPhone,
      customerAddress,
      paymentMethodName: paymentMethod === 'bkash' ? 'bKash (Send Money)' : paymentMethod === 'nagad' ? 'Nagad (Send Money)' : 'Cash on Delivery',
      items: items.map(item => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        size: item.product.selectedSize || 'Free Size'
      })),
      subtotal,
      deliveryCharge,
      discount,
      total
    });

    setIsSuccess(true);
  };

  if (items.length === 0 && !isSuccess) {
    return (
      <div className="checkout-container" style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Your Cart is Empty!</h2>
        <p style={{ color: 'var(--sf-text-secondary)', marginBottom: '24px' }}>Please add some products to your cart and try again.</p>
        <Link to="/" className="btn-confirm" style={{ width: 'auto', padding: '0 32px' }}>Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Secure Order Form</h1>
        <p>Please fill out the form with correct details to complete your order</p>
      </div>

      <form className="checkout-layout" onSubmit={handleSubmit}>
        
        {/* Step 1: Order Summary at the Top */}
        <div className="checkout-panel checkout-summary-panel">
          <h2 className="checkout-panel-title">
            <Package size={24} /> Order Summary
          </h2>
          
          <div className="summary-items">
            {items.map((item, idx) => (
              <div key={idx} className="summary-item">
                <img src={item.product.image} alt={item.product.name} className="summary-item-image" />
                <div className="summary-item-info">
                  <div className="summary-item-name">{item.product.name}</div>
                  <div className="summary-item-variant">Color: Default | Size: {item.product.selectedSize || 'Free Size'}</div>
                  <div className="summary-item-price-row">
                    <div className="summary-item-price">৳{item.product.price}</div>
                    <div className="qty-control">
                      <button type="button" className="qty-btn" onClick={() => handleQuantityChange(item.product.id, item.product.selectedSize || 'Free Size', -1)}>
                        <Minus size={12} />
                      </button>
                      <div className="qty-val">{item.quantity}</div>
                      <button type="button" className="qty-btn" onClick={() => handleQuantityChange(item.product.id, item.product.selectedSize || 'Free Size', 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coupon / Promo Code Form */}
          <div style={{ padding: '16px', background: 'var(--sf-bg-secondary, #fafafa)', borderTop: '1px dashed var(--border-secondary)', borderBottom: '1px dashed var(--border-secondary)', margin: '0 0 16px 0' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sf-text-secondary)', marginBottom: '8px' }}>Promo Code</div>
            {appliedCoupon ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                  '{appliedCoupon.code}' applied ({appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `৳${appliedCoupon.value}`} discount)
                </span>
                <button type="button" onClick={handleRemoveCoupon} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter code (e.g. SUMMER20)"
                  className="form-input"
                  style={{ height: '36px', fontSize: '0.8rem', textTransform: 'uppercase', flex: 1 }}
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidating}
                  style={{ height: '36px', padding: '0 16px', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  {isValidating ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>{couponError}</div>}
            {couponSuccess && <div style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>{couponSuccess}</div>}
          </div>

          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping Charge</span>
              <span>৳{deliveryCharge.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row discount">
                <span>Discount</span>
                <span>-৳{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>৳{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Step 2: Customer Details */}
        <div className="checkout-panel">
          <h2 className="checkout-panel-title">
            <User size={20} /> Customer & Delivery Details
          </h2>

          {/* Quick-fill from saved addresses */}
          {customer && customer.addresses && customer.addresses.length > 0 && (
            <div className="checkout-saved-addresses-container">
              <div className="checkout-saved-addresses-title">
                <MapPin size={16} /> Select from Saved Addresses (Quick Fill)
              </div>
              <div className="checkout-address-list">
                {customer.addresses.map((addr) => {
                  const isSelected = String(selectedAddressId) === String(addr.id);
                  return (
                    <div 
                      key={addr.id} 
                      className={`checkout-address-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectAddress(addr)}
                    >
                      <div className="checkout-address-card-header">
                        <span className="checkout-address-label">{addr.label}</span>
                        {isSelected && (
                          <span className="checkout-address-check">
                            <CheckCircle size={14} />
                          </span>
                        )}
                      </div>
                      <div className="checkout-address-name">{addr.name}</div>
                      <div className="checkout-address-phone">{addr.phone}</div>
                      <div className="checkout-address-details">{addr.address}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Full Name <span>*</span></label>
              <input type="text" className="form-input" placeholder="Enter your name" required value={customerName} onChange={(e) => { setCustomerName(e.target.value); setNameEdited(true); setSelectedAddressId(''); }} />
            </div>
            
            <div className="form-group full-width">
              <label className="form-label">Phone Number <span>*</span></label>
              <input type="tel" className="form-input" placeholder="e.g. 017XXXXXXXX" required value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setPhoneEdited(true); setSelectedAddressId(''); }} />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Email Address <span style={{ color: '#94a3b8', fontWeight: 'normal', fontSize: '0.78rem' }}>(Optional)</span></label>
              <input type="email" className="form-input" placeholder="e.g. example@gmail.com (to receive order receipt)" value={customerEmail} onChange={(e) => { setCustomerEmail(e.target.value); setEmailEdited(true); }} />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Detailed Address <span>*</span></label>
              <input type="text" className="form-input" placeholder="House/Holding no, Road no, Area, Thana & District" required value={customerAddress} onChange={(e) => { setCustomerAddress(e.target.value); setAddressEdited(true); setSelectedAddressId(''); }} />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Order Note (Optional)</label>
              <input type="text" className="form-input" placeholder="Extra instructions or details for delivery" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
            </div>

            {customer && (
              <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <input 
                  type="checkbox" 
                  id="saveAddressCheckbox" 
                  checked={saveAddress} 
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--sf-accent)' }}
                />
                <label htmlFor="saveAddressCheckbox" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text-secondary)', userSelect: 'none' }}>
                  Save this address to my profile
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Shipping Charge & Payment Method */}
        <div className="checkout-panel">
          <div className="method-grid">
            <div>
              <h3 className="method-title">
                <Truck size={18} /> Shipping Rate
              </h3>
              <div className="selection-row">
                <div className={`selection-card ${shippingLocation === 'dhaka' ? 'active' : ''}`} onClick={() => setShippingLocation('dhaka')}>
                  <div className="selection-card-content">
                    <div className="selection-card-title">Inside Dhaka</div>
                    <div className="selection-card-desc">৳{config.delivery.insideDhakaPrice} ({config.delivery.insideDhakaTimeline})</div>
                  </div>
                  {shippingLocation === 'dhaka' && <CheckCircle size={18} color="var(--sf-accent)" />}
                </div>
                <div className={`selection-card ${shippingLocation === 'outside' ? 'active' : ''}`} onClick={() => setShippingLocation('outside')}>
                  <div className="selection-card-content">
                    <div className="selection-card-title">Outside Dhaka</div>
                    <div className="selection-card-desc">৳{config.delivery.outsideDhakaPrice} ({config.delivery.outsideDhakaTimeline})</div>
                  </div>
                  {shippingLocation === 'outside' && <CheckCircle size={18} color="var(--sf-accent)" />}
                </div>
              </div>
            </div>

            <div>
              <h3 className="method-title">
                <CreditCard size={18} /> Payment Method
              </h3>

              <div className="payment-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '10px' }}>
                {/* COD */}
                <div 
                  className={`payment-card ${paymentMethod === 'cod' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cod')}
                  style={{ cursor: 'pointer', padding: '12px', borderRadius: '10px', border: paymentMethod === 'cod' ? '2px solid var(--sf-accent)' : '1px solid var(--sf-border)', background: paymentMethod === 'cod' ? 'var(--sf-bg-light)' : 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Package size={20} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Cash on Delivery</span>
                </div>

                {/* bKash */}
                <div 
                  className={`payment-card ${paymentMethod === 'bkash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('bkash')}
                  style={{ cursor: 'pointer', padding: '12px', borderRadius: '10px', border: paymentMethod === 'bkash' ? '2px solid #e11d48' : '1px solid var(--sf-border)', background: paymentMethod === 'bkash' ? 'rgba(225, 29, 72, 0.06)' : 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div style={{ background: '#e11d48', color: 'white', fontWeight: 800, fontSize: '10px', padding: '3px 6px', borderRadius: '4px' }}>bKash</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e11d48' }}>bKash</span>
                </div>

                {/* Nagad */}
                <div 
                  className={`payment-card ${paymentMethod === 'nagad' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('nagad')}
                  style={{ cursor: 'pointer', padding: '12px', borderRadius: '10px', border: paymentMethod === 'nagad' ? '2px solid #ea580c' : '1px solid var(--sf-border)', background: paymentMethod === 'nagad' ? 'rgba(234, 88, 12, 0.06)' : 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div style={{ background: '#ea580c', color: 'white', fontWeight: 800, fontSize: '10px', padding: '3px 6px', borderRadius: '4px' }}>NAGAD</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ea580c' }}>Nagad</span>
                </div>
              </div>

              {/* Instructions & Inputs for bKash / Nagad */}
              {(paymentMethod === 'bkash' || paymentMethod === 'nagad') && (
                <div style={{ marginTop: '16px', padding: '16px', background: paymentMethod === 'bkash' ? 'rgba(225, 29, 72, 0.04)' : 'rgba(234, 88, 12, 0.04)', border: `1.5px dashed ${paymentMethod === 'bkash' ? '#e11d48' : '#ea580c'}`, borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: paymentMethod === 'bkash' ? '#e11d48' : '#ea580c', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={18} /> {paymentMethod === 'bkash' ? 'bKash (bKash)' : 'Nagad (Nagad)'} instructions:
                  </div>

                  <ol style={{ paddingLeft: '20px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--sf-text-secondary)', margin: '0 0 14px 0' }}>
                    <li>Open your <b>{paymentMethod === 'bkash' ? 'bKash' : 'Nagad'}</b> app or dial <b>{paymentMethod === 'bkash' ? '*247#' : '*167#'}</b> and select <b>Send Money</b>.</li>
                    <li>Send to number: <b style={{ fontSize: '0.95rem', color: paymentMethod === 'bkash' ? '#e11d48' : '#ea580c', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--sf-border)' }}>{paymentMethod === 'bkash' ? '01700000000' : '01800000000'}</b> (Personal)</li>
                    <li>Send the total payable amount: <b style={{ color: 'var(--sf-text-primary)' }}>৳{total.toFixed(2)}</b>.</li>
                    <li>After sending, enter your <b>Transaction ID (TrxID)</b> and <b>Sender Phone number</b> below.</li>
                  </ol>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--sf-text-primary)', display: 'block', marginBottom: '4px' }}>
                        Sender Phone number (bKash/Nagad) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="tel"
                        placeholder="e.g. 017XXXXXXXX"
                        required
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        style={{ width: '100%', height: '40px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', fontSize: '0.85rem', color: '#0f172a', backgroundColor: '#ffffff', fontWeight: 600 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--sf-text-primary)', display: 'block', marginBottom: '4px' }}>
                        Transaction ID (TrxID) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. 8N7X9K2L1"
                        required
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                        style={{ width: '100%', height: '40px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: '#0f172a', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Submit Actions & Trust Badges */}
        <div className="checkout-actions-bottom" style={{ marginTop: '8px' }}>
          <button type="submit" className="btn-confirm" style={{ height: '52px', fontSize: '1.1rem' }}>
            Confirm Order <ArrowRight size={20} />
          </button>
          
          <div className="trust-badges-grid" style={{ marginTop: '24px' }}>
            <div className="trust-badge-item"><Shield size={16} /> 100% Secure Order</div>
            <div className="trust-badge-item"><Truck size={16} /> Fast Delivery</div>
            <div className="trust-badge-item"><RotateCcw size={16} /> Easy Returns</div>
            <div className="trust-badge-item"><Headphones size={16} /> Customer Support</div>
          </div>
        </div>

      </form>

      {/* Success Modal */}
      {isSuccess && submittedOrder && (
        <div className="success-modal-overlay">
          <div className="success-modal invoice-expanded">
            {/* Header Success alert */}
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px' }}>
              <div className="success-icon" style={{ background: '#10b981', color: 'white', marginBottom: '8px', width: '40px', height: '40px' }}>
                <CheckCircle size={28} />
              </div>
              <h2 style={{ fontSize: '1.25rem', color: '#16a34a', margin: 0, fontWeight: 800 }}>Order Successful!</h2>
              <p style={{ fontSize: '0.82rem', color: '#15803d', margin: '4px 0 0 0', lineHeight: 1.4 }}>Your order has been completed successfully. Click "Print / Save Invoice" below to print or save the receipt.</p>
            </div>

            {/* Printable Invoice Card */}
            <div className="printable-invoice" style={{ background: 'white' }}>
              <div className="invoice-header">
                <div>
                  <h1 className="invoice-title">{config.branding.storeName || 'Gazi Sports'}</h1>
                  <span style={{ fontSize: '0.78rem', color: 'var(--sf-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Play Hard, Shop Smart</span>
                </div>
                <div className="invoice-meta">
                  <div><b>Invoice No:</b> {submittedOrder.invoiceNo}</div>
                  <div><b>Date:</b> {submittedOrder.date}</div>
                  <div><b>Payment:</b> {submittedOrder.paymentMethodName}</div>
                </div>
              </div>

              <div className="invoice-parties">
                <div>
                  <div className="invoice-party-title">Sender</div>
                  <div className="invoice-party-details">
                    <b>{config.branding.storeName || 'Gazi Sports'}</b><br />
                    Phone: {config.contactInfo.phoneNumber || '01700000000'}<br />
                    Email: {config.contactInfo.email || 'support@gazisports.com'}<br />
                    Address: Dhaka, Bangladesh
                  </div>
                </div>
                <div>
                  <div className="invoice-party-title">Billing & Delivery Address</div>
                  <div className="invoice-party-details">
                    <b>Name:</b> {submittedOrder.customerName}<br />
                    <b>Phone:</b> {submittedOrder.customerPhone}<br />
                    <b>Address:</b> {submittedOrder.customerAddress}
                  </div>
                </div>
              </div>

              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Product Description</th>
                      <th style={{ textAlign: 'center' }}>Size</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedOrder.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td style={{ textAlign: 'center' }}>{item.size}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity} pcs</td>
                        <td style={{ textAlign: 'right' }}>৳{item.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>৳{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoice-totals">
                <div className="invoice-total-row">
                  <span>Subtotal</span>
                  <span>৳{submittedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="invoice-total-row">
                  <span>Shipping Charge</span>
                  <span>৳{submittedOrder.deliveryCharge.toFixed(2)}</span>
                </div>
                {submittedOrder.discount > 0 && (
                  <div className="invoice-total-row" style={{ color: '#ef4444' }}>
                    <span>Discount</span>
                    <span>-৳{submittedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="invoice-total-row grand-total">
                  <span>Grand Total</span>
                  <span>৳{submittedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="invoice-footer">
                <p>Thank you for shopping with us!</p>
                <p style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>This is a computer generated invoice, no signature is required.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--sf-border)', paddingTop: '20px' }}>
              <button 
                onClick={() => window.print()} 
                style={{ flex: 1, height: '44px', background: 'var(--sf-accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                Print / Save Invoice
              </button>
              <Link 
                to="/" 
                className="btn-confirm" 
                style={{ flex: 1, height: '44px', border: '1.5px solid var(--sf-border)', background: 'white', color: 'var(--sf-text-primary)', textDecoration: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, fontWeight: 700 }}
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
